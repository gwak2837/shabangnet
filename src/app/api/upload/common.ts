import { and, eq, isNull, sql } from 'drizzle-orm'

import type { Transaction } from '@/db/client'
import type { ParsedOrder } from '@/lib/excel'

import { manufacturer, product } from '@/db/schema/manufacturers'

import type {
  LookupMaps,
  ManufacturerBreakdown,
  ManufacturerInfo,
  OptionMappingInfo,
  ProductInfo,
  UploadSummary,
} from './type'

export const VALID_EXTENSIONS = ['.xlsx', '.xls']

interface AutoCreateManufacturersParams {
  lookupMaps: LookupMaps
  orders: ParsedOrder[]
  tx: Transaction
}

interface AutoCreateProductsParams {
  orderValues: Array<{
    manufacturerId: number | null
    optionName: string | null
    productCode: string | null
    productName: string | null
  }>
  tx: Transaction
}

export async function autoCreateManufacturers({
  orders,
  lookupMaps,
  tx,
}: AutoCreateManufacturersParams): Promise<string[]> {
  const createdNames: string[] = []

  const manufacturerNames = [
    ...new Set(
      orders
        .map((o) => (typeof o.manufacturer === 'string' ? normalizeManufacturerName(o.manufacturer) : null))
        .filter((name): name is string => !!name),
    ),
  ]

  for (const rawName of manufacturerNames) {
    const name = rawName.trim()
    const key = name.toLowerCase()

    if (lookupMaps.manufacturerMap.has(key)) {
      continue
    }

    const [existing] = await tx
      .select({ id: manufacturer.id, name: manufacturer.name })
      .from(manufacturer)
      .where(sql`lower(trim(${manufacturer.name})) = ${key}`)
      .limit(1)

    const record =
      existing ??
      (
        await tx
          .insert(manufacturer)
          .values({ name, email: null, orderCount: 0 })
          .returning({ id: manufacturer.id, name: manufacturer.name })
      )[0]

    if (record) {
      lookupMaps.manufacturerMap.set(record.name.toLowerCase(), { id: record.id, name: record.name })
      if (!existing) {
        createdNames.push(record.name)
      }
    }
  }

  return createdNames
}

export async function autoCreateProducts({ orderValues, tx }: AutoCreateProductsParams): Promise<void> {
  const productByCode = new Map<
    string,
    { manufacturerId: number | null; optionName: string | null; productName: string }
  >()

  for (const row of orderValues) {
    if (!row.productCode || !row.productName) {
      continue
    }

    const code = row.productCode.trim()
    if (!code) {
      continue
    }

    if (!productByCode.has(code)) {
      productByCode.set(code, {
        manufacturerId: row.manufacturerId ?? null,
        productName: row.productName,
        optionName: row.optionName ?? null,
      })
    }
  }

  const productValues = [...productByCode.entries()].map(([code, v]) => ({
    productCode: code,
    productName: v.productName,
    optionName: v.optionName,
    manufacturerId: v.manufacturerId,
  }))

  if (productValues.length === 0) {
    return
  }

  await tx.insert(product).values(productValues).onConflictDoNothing({ target: product.productCode })

  for (const [code, v] of productByCode.entries()) {
    if (!v.manufacturerId) {
      continue
    }
    await tx
      .update(product)
      .set({ manufacturerId: v.manufacturerId })
      .where(and(eq(product.productCode, code), isNull(product.manufacturerId)))
  }
}

export function buildLookupMaps(
  manufacturers: ManufacturerInfo[],
  products: ProductInfo[],
  optionMappings: OptionMappingInfo[],
): LookupMaps {
  return {
    manufacturerMap: new Map(manufacturers.map((m) => [m.name.toLowerCase(), m])),
    productMap: new Map(products.map((p) => [p.productCode.toLowerCase(), p])),
    optionMap: new Map(optionMappings.map((o) => [`${o.productCode.toLowerCase()}_${o.optionName.toLowerCase()}`, o])),
  }
}

export function calculateManufacturerBreakdown(groupedOrders: Map<string, ParsedOrder[]>): ManufacturerBreakdown[] {
  const breakdown: ManufacturerBreakdown[] = []

  groupedOrders.forEach((ordersGroup, mfr) => {
    const totalAmount = ordersGroup.reduce((sum, o) => sum + o.paymentAmount * o.quantity, 0)
    const totalQuantity = ordersGroup.reduce((sum, o) => sum + o.quantity, 0)
    const totalCost = ordersGroup.reduce((sum, o) => sum + o.cost, 0)
    const uniqueProducts = new Set(ordersGroup.map((o) => o.productCode || o.productName).filter(Boolean))
    const marginRate =
      totalCost > 0 && totalAmount > 0 ? Math.round(((totalAmount - totalCost) / totalAmount) * 100) : null

    breakdown.push({
      name: mfr,
      orders: ordersGroup.length,
      amount: totalAmount,
      totalQuantity,
      totalCost,
      productCount: uniqueProducts.size,
      marginRate,
    })
  })

  // 정렬 (주문 수 기준 내림차순)
  breakdown.sort((a, b) => b.orders - a.orders)

  return breakdown
}

export function calculateSummary(breakdown: ManufacturerBreakdown[]): UploadSummary {
  const totalAmount = breakdown.reduce((sum, m) => sum + m.amount, 0)
  const totalCost = breakdown.reduce((sum, m) => sum + m.totalCost, 0)
  const estimatedMargin = totalCost > 0 ? totalAmount - totalCost : null

  return { totalAmount, totalCost, estimatedMargin }
}

export function matchManufacturerId(order: ParsedOrder, lookupMaps: LookupMaps): number | null {
  const { manufacturerMap, productMap, optionMap } = lookupMaps

  // 1) 옵션 매핑 확인
  if (order.productCode && order.optionName) {
    const optionKey = `${order.productCode.toLowerCase()}_${order.optionName.toLowerCase()}`
    const om = optionMap.get(optionKey)
    if (om) {
      return om.manufacturerId
    }
  }

  // 2) 상품 매핑 확인 (옵션 매핑이 없는 경우)
  if (order.productCode) {
    const p = productMap.get(order.productCode.toLowerCase())
    if (p?.manufacturerId) {
      return p.manufacturerId
    }
  }

  // 3) 파일 내 제조사명으로 매칭
  if (order.manufacturer) {
    const mfr = manufacturerMap.get(order.manufacturer.toLowerCase())
    if (mfr) {
      return mfr.id
    }
  }

  return null
}

export function normalizeManufacturerName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, ' ')
  if (!name) {
    return null
  }

  const lower = name.toLowerCase()
  if (lower === '미지정' || lower === '미등록' || lower === '없음' || lower === 'n/a' || lower === 'na') {
    return null
  }

  return name
}

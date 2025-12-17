import { and, eq, inArray, isNull, sql } from 'drizzle-orm'

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
    cost: number
    manufacturerId: number | null
    optionName: string | null
    paymentAmount: number
    productCode: string | null
    productName: string | null
    quantity: number
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
    { cost: number; manufacturerId: number | null; optionName: string | null; price: number; productName: string }
  >()

  for (const row of orderValues) {
    if (!row.productCode || !row.productName) {
      continue
    }

    const code = row.productCode.trim()
    if (!code) {
      continue
    }

    const quantity = Number.isFinite(row.quantity) && row.quantity > 0 ? row.quantity : 1
    // 결제금액은 "수량 포함" 총액이라서 단가로 변환해요.
    const price =
      Number.isFinite(row.paymentAmount) && row.paymentAmount > 0 ? Math.round(row.paymentAmount / quantity) : 0
    const cost = Number.isFinite(row.cost) && row.cost > 0 ? Math.round(row.cost / quantity) : 0

    if (!productByCode.has(code)) {
      productByCode.set(code, {
        manufacturerId: row.manufacturerId ?? null,
        productName: row.productName,
        optionName: row.optionName ?? null,
        price,
        cost,
      })
      continue
    }

    // 같은 상품코드가 여러 번 등장할 수 있어서, 값이 아직 없으면 채워요.
    // (이미 값이 있으면 유지해요)
    const prev = productByCode.get(code)
    if (!prev) continue

    if (!prev.manufacturerId && row.manufacturerId) prev.manufacturerId = row.manufacturerId
    if ((!prev.optionName || prev.optionName.trim().length === 0) && row.optionName) prev.optionName = row.optionName
    if (prev.price === 0 && price > 0) prev.price = price
    if (prev.cost === 0 && cost > 0) prev.cost = cost
  }

  const productValues = [...productByCode.entries()].map(([code, v]) => ({
    productCode: code,
    productName: v.productName,
    optionName: v.optionName,
    manufacturerId: v.manufacturerId,
    price: v.price,
    cost: v.cost,
  }))

  if (productValues.length === 0) {
    return
  }

  await tx.insert(product).values(productValues).onConflictDoNothing({ target: product.productCode })

  // 업로드로 들어온 데이터로 price/cost를 채워요 (0인 값만)
  const codes = [...productByCode.keys()]
  const priceCases = [...productByCode.entries()]
    .filter(([, v]) => v.price > 0)
    .map(([code, v]) => sql`when ${product.productCode} = ${code} then ${v.price}`)
  const costCases = [...productByCode.entries()]
    .filter(([, v]) => v.cost > 0)
    .map(([code, v]) => sql`when ${product.productCode} = ${code} then ${v.cost}`)

  if (codes.length > 0 && (priceCases.length > 0 || costCases.length > 0)) {
    const priceExpr =
      priceCases.length > 0
        ? sql`case ${sql.join(priceCases, sql` `)} else ${product.price} end`
        : sql`${product.price}`
    const costExpr =
      costCases.length > 0 ? sql`case ${sql.join(costCases, sql` `)} else ${product.cost} end` : sql`${product.cost}`

    await tx
      .update(product)
      .set({
        price: sql`case when ${product.price} = 0 then ${priceExpr} else ${product.price} end`,
        cost: sql`case when ${product.cost} = 0 then ${costExpr} else ${product.cost} end`,
        updatedAt: new Date(),
      })
      .where(inArray(product.productCode, codes))
  }

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
    // 결제금액은 "수량 포함" 총액이에요.
    const totalAmount = ordersGroup.reduce((sum, o) => sum + o.paymentAmount, 0)
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

  // 1) 옵션 연결 확인
  if (order.productCode && order.optionName) {
    const optionKey = `${order.productCode.toLowerCase()}_${order.optionName.toLowerCase()}`
    const om = optionMap.get(optionKey)
    if (om) {
      return om.manufacturerId
    }
  }

  // 2) 상품 연결 확인 (옵션 연결이 없는 경우)
  if (order.productCode) {
    const p = productMap.get(order.productCode.toLowerCase())
    if (p?.manufacturerId) {
      return p.manufacturerId
    }
  }

  // 3) 파일 내 제조사명으로 연결
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

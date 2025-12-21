import { and, eq, inArray, isNull, sql } from 'drizzle-orm'

import type { Transaction } from '@/db/client'
import type { ParsedOrder } from '@/lib/excel'

import { optionMapping, product } from '@/db/schema/manufacturers'
import { normalizeOptionName } from '@/utils/normalize-option-name'

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

interface AutoCreateUnmappedOptionCandidatesParams {
  lookupMaps: LookupMaps
  orders: ParsedOrder[]
  tx: Transaction
}

export async function autoCreateManufacturers({ orders, lookupMaps, tx }: AutoCreateManufacturersParams) {
  const createdNames: string[] = []

  const duplicatedManufacturerNames = orders
    .map((o) => (typeof o.manufacturer === 'string' ? normalizeManufacturerName(o.manufacturer) : null))
    .filter((name): name is string => !!name)

  const manufacturerNames = [...new Set(duplicatedManufacturerNames)]

  for (const rawName of manufacturerNames) {
    const name = rawName.trim()
    const nameKey = name.toLowerCase()

    if (lookupMaps.manufacturerMap.has(nameKey)) {
      continue
    }

    // NOTE: xmax 떄문에 sql 사용함
    const [record] = await tx.execute<{ id: number; name: string; isNew: boolean }>(sql`
      INSERT INTO manufacturer (name, email, order_count)
      VALUES (${name}, null, 0)
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name, (xmax = 0) AS is_new
    `)

    if (record) {
      lookupMaps.manufacturerMap.set(record.name.toLowerCase(), { id: record.id, name: record.name })
      if (record.isNew) {
        createdNames.push(record.name)
      }
    }
  }

  return createdNames
}

export async function autoCreateProducts({ orderValues, tx }: AutoCreateProductsParams) {
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

export async function autoCreateUnmappedOptionCandidates({
  orders,
  lookupMaps,
  tx,
}: AutoCreateUnmappedOptionCandidatesParams): Promise<void> {
  const values: Array<{ manufacturerId: null; optionName: string; productCode: string }> = []
  const seenKeys = new Set<string>()

  for (const o of orders) {
    const manufacturerName = typeof o.manufacturer === 'string' ? normalizeManufacturerName(o.manufacturer) : null
    if (manufacturerName) {
      continue
    }

    const productCode = typeof o.productCode === 'string' ? o.productCode.trim() : ''
    if (!productCode) {
      continue
    }

    const optionName = typeof o.optionName === 'string' ? normalizeOptionName(o.optionName) : ''
    if (!optionName) {
      continue
    }

    const key = `${productCode.toLowerCase()}_${optionName.toLowerCase()}`
    if (seenKeys.has(key)) {
      continue
    }
    seenKeys.add(key)

    if (lookupMaps.optionMap.has(key)) {
      continue
    }

    values.push({ productCode, optionName, manufacturerId: null })
  }

  if (values.length === 0) {
    return
  }

  await tx
    .insert(optionMapping)
    .values(values)
    .onConflictDoNothing({ target: [optionMapping.productCode, optionMapping.optionName] })
}

export function buildLookupMaps(
  manufacturers: ManufacturerInfo[],
  products: ProductInfo[],
  optionMappings: OptionMappingInfo[],
): LookupMaps {
  return {
    manufacturerMap: new Map(manufacturers.map((m) => [m.name.toLowerCase(), m])),
    productMap: new Map(products.map((p) => [p.productCode.toLowerCase(), p])),
    optionMap: new Map(
      optionMappings.map((o) => {
        const productCode = o.productCode.trim()
        const optionName = normalizeOptionName(o.optionName)
        return [`${productCode.toLowerCase()}_${optionName.toLowerCase()}`, { ...o, productCode, optionName }]
      }),
    ),
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

  // 1) 파일 내 제조사명으로 연결 (우선순위 가장 높아요)
  const manufacturerName = typeof order.manufacturer === 'string' ? normalizeManufacturerName(order.manufacturer) : null
  if (manufacturerName) {
    const mfr = manufacturerMap.get(manufacturerName.toLowerCase())
    if (mfr) {
      return mfr.id
    }
  }

  const productCode = typeof order.productCode === 'string' ? order.productCode.trim() : ''
  const optionName = typeof order.optionName === 'string' ? normalizeOptionName(order.optionName) : ''

  // 2) 옵션 연결 확인 (제조사가 확정된 연결만 적용해요)
  if (productCode && optionName) {
    const optionKey = `${productCode.toLowerCase()}_${optionName.toLowerCase()}`
    const om = optionMap.get(optionKey)
    if (om?.manufacturerId != null) {
      return om.manufacturerId
    }

    // 옵션은 있는데 제조사가 없다면(미연결 후보 포함), 상품 기본 연결로 추정하지 않아요.
    return null
  }

  // 3) 상품 연결 확인 (옵션이 없는 경우)
  if (productCode) {
    const p = productMap.get(productCode.toLowerCase())
    if (p?.manufacturerId) {
      return p.manufacturerId
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

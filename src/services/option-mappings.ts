'use server'

import { and, eq, sql } from 'drizzle-orm'

import { db } from '@/db/client'
import { manufacturer, optionMapping, product } from '@/db/schema/manufacturers'
import { order } from '@/db/schema/orders'

// Option mapping types
export interface OptionManufacturerMapping {
  createdAt: string
  id: number
  manufacturerId: number
  manufacturerName: string
  optionName: string
  productCode: string
  updatedAt: string
}

export async function create(
  data: Omit<OptionManufacturerMapping, 'createdAt' | 'id' | 'updatedAt'>,
): Promise<OptionManufacturerMapping> {
  const optionName = normalizeOptionName(data.optionName)
  const [newMapping] = await db
    .insert(optionMapping)
    .values({
      productCode: data.productCode,
      optionName,
      manufacturerId: data.manufacturerId,
    })
    .returning()

  const mfr = await db.query.manufacturer.findFirst({
    where: eq(manufacturer.id, data.manufacturerId),
  })

  // 옵션 연결은 우선순위가 높아서 기존 주문에도 즉시 반영(완료된 주문 제외)
  await db
    .update(order)
    .set({
      manufacturerId: data.manufacturerId,
      manufacturerName: mfr?.name ?? null,
    })
    .where(
      and(
        sql`lower(${order.productCode}) = lower(${data.productCode})`,
        sql`lower(${order.optionName}) = lower(${optionName})`,
        sql`${order.status} <> 'completed'`,
      ),
    )

  return mapToOptionMapping({ ...newMapping, manufacturer: mfr })
}

export async function getAll(): Promise<OptionManufacturerMapping[]> {
  const result = await db.query.optionMapping.findMany({
    with: {
      manufacturer: true,
    },
    orderBy: (optionMapping, { desc }) => [desc(optionMapping.createdAt)],
  })

  return result.map(mapToOptionMapping)
}

export async function getById(id: number): Promise<OptionManufacturerMapping | undefined> {
  const result = await db.query.optionMapping.findFirst({
    where: eq(optionMapping.id, id),
    with: {
      manufacturer: true,
    },
  })

  if (!result) return undefined
  return mapToOptionMapping(result)
}

export async function remove(id: number): Promise<void> {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        optionName: optionMapping.optionName,
        productCode: optionMapping.productCode,
      })
      .from(optionMapping)
      .where(eq(optionMapping.id, id))
      .limit(1)

    if (!row) {
      return
    }

    await tx.delete(optionMapping).where(eq(optionMapping.id, id))

    // 같은 키(상품코드+옵션명)로 다른 옵션 연결이 남아 있다면, 남아있는 값을 우선 적용해요.
    const [remaining] = await tx
      .select({ manufacturerId: optionMapping.manufacturerId })
      .from(optionMapping)
      .where(
        and(
          sql`lower(${optionMapping.productCode}) = lower(${row.productCode})`,
          sql`lower(${optionMapping.optionName}) = lower(${row.optionName})`,
        ),
      )
      .limit(1)

    if (remaining) {
      const mfr = await tx.query.manufacturer.findFirst({
        where: eq(manufacturer.id, remaining.manufacturerId),
      })

      await tx
        .update(order)
        .set({
          manufacturerId: remaining.manufacturerId,
          manufacturerName: mfr?.name ?? null,
        })
        .where(
          and(
            sql`lower(${order.productCode}) = lower(${row.productCode})`,
            sql`lower(${order.optionName}) = lower(${row.optionName})`,
            sql`${order.status} <> 'completed'`,
          ),
        )

      return
    }

    // 옵션 연결이 완전히 사라지면, 상품 연결(상품코드 기준)로 되돌려요.
    const [fallback] = await tx
      .select({
        manufacturerId: product.manufacturerId,
        manufacturerName: manufacturer.name,
      })
      .from(product)
      .leftJoin(manufacturer, eq(product.manufacturerId, manufacturer.id))
      .where(sql`lower(${product.productCode}) = lower(${row.productCode})`)
      .limit(1)

    await tx
      .update(order)
      .set({
        manufacturerId: fallback?.manufacturerId ?? null,
        manufacturerName: fallback?.manufacturerName ?? null,
      })
      .where(
        and(
          sql`lower(${order.productCode}) = lower(${row.productCode})`,
          sql`lower(${order.optionName}) = lower(${row.optionName})`,
          sql`${order.status} <> 'completed'`,
        ),
      )
  })
}

export async function update(
  id: number,
  data: Partial<Omit<OptionManufacturerMapping, 'createdAt' | 'id'>>,
): Promise<OptionManufacturerMapping> {
  const nextOptionName = typeof data.optionName === 'string' ? normalizeOptionName(data.optionName) : data.optionName
  const [updated] = await db
    .update(optionMapping)
    .set({
      productCode: data.productCode,
      optionName: nextOptionName,
      manufacturerId: data.manufacturerId,
      updatedAt: new Date(),
    })
    .where(eq(optionMapping.id, id))
    .returning()

  if (!updated) throw new Error('Mapping not found')

  const mfr = updated.manufacturerId
    ? await db.query.manufacturer.findFirst({
        where: eq(manufacturer.id, updated.manufacturerId),
      })
    : null

  // 옵션 연결은 우선순위가 높아서 기존 주문에도 즉시 반영(완료된 주문 제외)
  await db
    .update(order)
    .set({
      manufacturerId: updated.manufacturerId,
      manufacturerName: mfr?.name ?? null,
    })
    .where(
      and(
        sql`lower(${order.productCode}) = lower(${updated.productCode})`,
        sql`lower(${order.optionName}) = lower(${normalizeOptionName(updated.optionName)})`,
        sql`${order.status} <> 'completed'`,
      ),
    )

  return mapToOptionMapping({ ...updated, manufacturer: mfr })
}

function mapToOptionMapping(
  m: typeof optionMapping.$inferSelect & {
    manufacturer?: typeof manufacturer.$inferSelect | null
  },
): OptionManufacturerMapping {
  return {
    id: m.id,
    productCode: m.productCode,
    optionName: m.optionName,
    manufacturerId: m.manufacturerId,
    manufacturerName: m.manufacturer?.name || 'Unknown',
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }
}

function normalizeOptionName(raw: string): string {
  const value = raw.trim()
  if (!value) return ''
  // 옵션 텍스트 끝에 붙는 `[숫자]`는 수량 중복 표기라서 제거해요. (수량 컬럼은 별도로 있어요)
  return value.replace(/\s*\[\d+\]\s*$/, '').trim()
}

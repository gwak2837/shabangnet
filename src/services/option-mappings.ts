'use server'

import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm'

import { db } from '@/db/client'
import { manufacturer, optionMapping, product } from '@/db/schema/manufacturers'
import { order } from '@/db/schema/orders'
import { normalizeOptionName } from '@/utils/normalize-option-name'

// Option mapping types
export interface OptionManufacturerMapping {
  createdAt: string
  id: number
  manufacturerId: number | null
  manufacturerName: string | null
  optionName: string
  productCode: string
  updatedAt: string
}

export async function create(
  data: Omit<OptionManufacturerMapping, 'createdAt' | 'id' | 'updatedAt'>,
): Promise<OptionManufacturerMapping> {
  if (data.manufacturerId == null) {
    throw new Error('제조사를 선택해 주세요')
  }

  const productCode = data.productCode.trim()
  if (!productCode) {
    throw new Error('상품코드가 비어 있어요')
  }

  const optionName = normalizeOptionName(data.optionName)
  if (!optionName) {
    throw new Error('옵션명이 비어 있어요')
  }

  const now = new Date()
  const [newMapping] = await db
    .insert(optionMapping)
    .values({
      productCode,
      optionName,
      manufacturerId: data.manufacturerId,
    })
    .onConflictDoUpdate({
      target: [optionMapping.productCode, optionMapping.optionName],
      set: { manufacturerId: data.manufacturerId, updatedAt: now },
    })
    .returning()

  const [mfr] = await db.select().from(manufacturer).where(eq(manufacturer.id, data.manufacturerId))

  // 제조사가 없는 주문에만 채워요. (파일에 제조사가 있는 주문은 덮어쓰지 않아요)
  await db
    .update(order)
    .set({
      manufacturerId: data.manufacturerId,
      manufacturerName: mfr?.name ?? null,
    })
    .where(
      and(
        sql`lower(${order.productCode}) = lower(${productCode})`,
        sql`lower(${order.optionName}) = lower(${optionName})`,
        isNull(order.manufacturerId),
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
          isNotNull(optionMapping.manufacturerId),
        ),
      )
      .limit(1)

    if (remaining) {
      if (remaining.manufacturerId == null) {
        return
      }

      const [mfr] = await tx.select().from(manufacturer).where(eq(manufacturer.id, remaining.manufacturerId))

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
            isNull(order.manufacturerId),
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
          isNull(order.manufacturerId),
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

  const [mfr] =
    updated.manufacturerId != null
      ? await db.select().from(manufacturer).where(eq(manufacturer.id, updated.manufacturerId))
      : [null]

  if (updated.manufacturerId != null) {
    // 제조사가 없는 주문에만 채워요. (파일에 제조사가 있는 주문은 덮어쓰지 않아요)
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
          isNull(order.manufacturerId),
          sql`${order.status} <> 'completed'`,
        ),
      )
  }

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
    manufacturerName: m.manufacturer?.name ?? null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }
}

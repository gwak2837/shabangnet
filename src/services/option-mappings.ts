'use server'

import { and, eq, isNull, sql } from 'drizzle-orm'

import { db } from '@/db/client'
import { manufacturer, optionMapping } from '@/db/schema/manufacturers'
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
  const [newMapping] = await db
    .insert(optionMapping)
    .values({
      productCode: data.productCode,
      optionName: data.optionName,
      manufacturerId: data.manufacturerId,
    })
    .returning()

  const mfr = await db.query.manufacturer.findFirst({
    where: eq(manufacturer.id, data.manufacturerId),
  })

  // 옵션 매핑은 우선순위가 높아서 기존 주문에도 즉시 반영(완료된 주문 제외)
  await db
    .update(order)
    .set({
      manufacturerId: data.manufacturerId,
      manufacturerName: mfr?.name ?? null,
    })
    .where(
      and(
        isNull(order.excludedReason),
        sql`lower(${order.productCode}) = lower(${data.productCode})`,
        sql`lower(${order.optionName}) = lower(${data.optionName})`,
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
  await db.delete(optionMapping).where(eq(optionMapping.id, id))
}

export async function update(
  id: number,
  data: Partial<Omit<OptionManufacturerMapping, 'createdAt' | 'id'>>,
): Promise<OptionManufacturerMapping> {
  const [updated] = await db
    .update(optionMapping)
    .set({
      productCode: data.productCode,
      optionName: data.optionName,
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

  // 옵션 매핑은 우선순위가 높아서 기존 주문에도 즉시 반영(완료된 주문 제외)
  await db
    .update(order)
    .set({
      manufacturerId: updated.manufacturerId,
      manufacturerName: mfr?.name ?? null,
    })
    .where(
      and(
        isNull(order.excludedReason),
        sql`lower(${order.productCode}) = lower(${updated.productCode})`,
        sql`lower(${order.optionName}) = lower(${updated.optionName})`,
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

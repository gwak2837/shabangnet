'use server'

import { eq } from 'drizzle-orm'

import { db } from '@/db/client'
import { manufacturer, optionMapping } from '@/db/schema/manufacturers'

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

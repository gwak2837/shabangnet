'use server'

import { eq } from 'drizzle-orm'

import { db } from '@/db/client'
import { manufacturers, optionMappings } from '@/db/schema/manufacturers'

// Option mapping types
export interface OptionManufacturerMapping {
  createdAt: string
  id: string
  manufacturerId: string
  manufacturerName: string
  optionName: string
  productCode: string
  updatedAt: string
}

export async function create(
  data: Omit<OptionManufacturerMapping, 'createdAt' | 'id' | 'updatedAt'>,
): Promise<OptionManufacturerMapping> {
  const [newMapping] = await db
    .insert(optionMappings)
    .values({
      id: `om${Date.now()}`,
      productCode: data.productCode,
      optionName: data.optionName,
      manufacturerId: data.manufacturerId,
    })
    .returning()

  const manufacturer = await db.query.manufacturers.findFirst({
    where: eq(manufacturers.id, data.manufacturerId),
  })

  return mapToOptionMapping({ ...newMapping, manufacturer })
}

export async function getAll(): Promise<OptionManufacturerMapping[]> {
  const result = await db.query.optionMappings.findMany({
    with: {
      manufacturer: true,
    },
    orderBy: (mappings, { desc }) => [desc(mappings.createdAt)],
  })

  return result.map(mapToOptionMapping)
}

export async function getById(id: string): Promise<OptionManufacturerMapping | undefined> {
  const result = await db.query.optionMappings.findFirst({
    where: eq(optionMappings.id, id),
    with: {
      manufacturer: true,
    },
  })

  if (!result) return undefined
  return mapToOptionMapping(result)
}

export async function remove(id: string): Promise<void> {
  await db.delete(optionMappings).where(eq(optionMappings.id, id))
}

export async function update(
  id: string,
  data: Partial<Omit<OptionManufacturerMapping, 'createdAt' | 'id'>>,
): Promise<OptionManufacturerMapping> {
  const [updated] = await db
    .update(optionMappings)
    .set({
      productCode: data.productCode,
      optionName: data.optionName,
      manufacturerId: data.manufacturerId,
      updatedAt: new Date(),
    })
    .where(eq(optionMappings.id, id))
    .returning()

  if (!updated) throw new Error('Mapping not found')

  const manufacturer = updated.manufacturerId
    ? await db.query.manufacturers.findFirst({
        where: eq(manufacturers.id, updated.manufacturerId),
      })
    : null

  return mapToOptionMapping({ ...updated, manufacturer })
}

function mapToOptionMapping(
  m: typeof optionMappings.$inferSelect & {
    manufacturer?: typeof manufacturers.$inferSelect | null
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

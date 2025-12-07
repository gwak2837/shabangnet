'use server'

import { eq } from 'drizzle-orm'

import { db } from '@/db/client'
import { courierMapping } from '@/db/schema/settings'
import { PartialExcept } from '@/utils/types'

export interface CourierMapping {
  aliases: string[]
  code: string
  enabled: boolean
  id: number
  name: string
}

export async function addCourierMapping(data: Omit<CourierMapping, 'id'>) {
  const [newMapping] = await db
    .insert(courierMapping)
    .values({
      name: data.name,
      code: data.code,
      aliases: data.aliases,
      enabled: data.enabled,
    })
    .returning({
      id: courierMapping.id,
      name: courierMapping.name,
      code: courierMapping.code,
      aliases: courierMapping.aliases,
      enabled: courierMapping.enabled,
    })

  return {
    id: newMapping.id,
    name: newMapping.name,
    code: newMapping.code,
    aliases: (newMapping.aliases as string[]) || [],
    enabled: newMapping.enabled || false,
  }
}

export async function removeCourierMapping(id: number) {
  await db.delete(courierMapping).where(eq(courierMapping.id, id))
}

export async function updateCourierMapping(data: PartialExcept<CourierMapping, 'id'>) {
  const [updated] = await db
    .update(courierMapping)
    .set({
      name: data.name,
      code: data.code,
      aliases: data.aliases,
      enabled: data.enabled,
    })
    .where(eq(courierMapping.id, data.id))
    .returning({
      id: courierMapping.id,
      name: courierMapping.name,
      code: courierMapping.code,
      aliases: courierMapping.aliases,
      enabled: courierMapping.enabled,
    })

  if (!updated) {
    throw new Error('Courier mapping not found')
  }

  return {
    id: updated.id,
    name: updated.name,
    code: updated.code,
    aliases: updated.aliases ?? [],
    enabled: updated.enabled || false,
  }
}

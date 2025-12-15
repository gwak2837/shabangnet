'use server'

import type { DuplicateCheckSettings } from '@/services/settings'

import { db } from '@/db/client'
import { settings } from '@/db/schema/settings'
import { getDuplicateCheckSettings } from '@/services/settings'

export async function updateDuplicateCheckSettings(data: Partial<DuplicateCheckSettings>) {
  const current = await getDuplicateCheckSettings()
  const updated = { ...current, ...data }
  return setSetting('duplicate_check', updated)
}

async function setSetting<T>(key: string, value: T, description?: string) {
  const [record] = await db
    .insert(settings)
    .values({
      key,
      value: JSON.stringify(value),
      description,
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value: JSON.stringify(value),
        updatedAt: new Date(),
      },
    })
    .returning()

  return JSON.parse(record.value!) as T
}

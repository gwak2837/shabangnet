'use server'

import type { DuplicateCheckSettings } from '@/services/settings'

import { db } from '@/db/client'
import { settings } from '@/db/schema/settings'
import { getDuplicateCheckSettings } from '@/services/settings'

export async function updateDuplicateCheckSettings(data: Partial<DuplicateCheckSettings>) {
  const current = await getDuplicateCheckSettings()
  const updated = { ...current, ...data }

  const [record] = await db
    .insert(settings)
    .values({
      key: 'duplicate_check',
      value: JSON.stringify(updated),
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value: JSON.stringify(updated),
        updatedAt: new Date(),
      },
    })
    .returning({ value: settings.value })

  return JSON.parse(record.value ?? '{}') as DuplicateCheckSettings
}

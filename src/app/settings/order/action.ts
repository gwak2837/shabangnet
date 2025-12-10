'use server'

import { eq } from 'drizzle-orm'

import type { DuplicateCheckSettings } from '@/services/settings'

import { isUniqueViolation } from '@/common/constants/postgres-errors'
import { db } from '@/db/client'
import { columnSynonym, settings } from '@/db/schema/settings'
import { getDuplicateCheckSettings } from '@/services/settings'

export async function addSynonym(data: { standardKey: string; synonym: string }) {
  try {
    const [newSynonym] = await db
      .insert(columnSynonym)
      .values({
        standardKey: data.standardKey,
        synonym: data.synonym,
        enabled: true,
      })
      .returning({
        id: columnSynonym.id,
        standardKey: columnSynonym.standardKey,
        synonym: columnSynonym.synonym,
        enabled: columnSynonym.enabled,
      })

    return {
      id: newSynonym.id,
      standardKey: newSynonym.standardKey,
      synonym: newSynonym.synonym,
      enabled: newSynonym.enabled ?? true,
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: `이미 존재하는 동의어입니다: "${data.synonym}"` }
    }
    console.error('addSynonym', error)
    return { error: '동의어를 추가하지 못했어요' }
  }
}

export async function removeSynonym(id: number) {
  await db.delete(columnSynonym).where(eq(columnSynonym.id, id))
}

export async function updateDuplicateCheckSettings(data: Partial<DuplicateCheckSettings>) {
  const current = await getDuplicateCheckSettings()
  const updated = { ...current, ...data }
  return setSetting('duplicate_check', updated)
}

export async function updateSynonym({
  id,
  enabled,
  standardKey,
  synonym,
}: {
  id: number
  enabled?: boolean
  standardKey?: string
  synonym?: string
}) {
  const [updated] = await db
    .update(columnSynonym)
    .set({
      enabled,
      standardKey,
      synonym,
    })
    .where(eq(columnSynonym.id, id))
    .returning()

  if (!updated) throw new Error('Synonym not found')

  return {
    id: updated.id,
    standardKey: updated.standardKey,
    synonym: updated.synonym,
    enabled: updated.enabled ?? true,
  }
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

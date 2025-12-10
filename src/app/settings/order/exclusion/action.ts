'use server'

import { eq } from 'drizzle-orm'

import type { ExclusionPattern, ExclusionSettings } from '@/services/settings'

import { isUniqueViolation } from '@/common/constants/postgres-errors'
import { db } from '@/db/client'
import { exclusionPattern, settings } from '@/db/schema/settings'

export async function addExclusionPattern(pattern: Omit<ExclusionPattern, 'id'>) {
  try {
    const [newPattern] = await db
      .insert(exclusionPattern)
      .values({
        pattern: pattern.pattern,
        description: pattern.description,
        enabled: pattern.enabled,
      })
      .returning({
        id: exclusionPattern.id,
        pattern: exclusionPattern.pattern,
        description: exclusionPattern.description,
        enabled: exclusionPattern.enabled,
      })

    return {
      id: newPattern.id,
      pattern: newPattern.pattern,
      description: newPattern.description || undefined,
      enabled: newPattern.enabled || false,
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: `이미 존재: ${pattern.pattern}` }
    }
    console.error('addExclusionPattern', error)
    return { error: '패턴을 추가하지 못했어요' }
  }
}

export async function getExclusionSettings(): Promise<ExclusionSettings> {
  const [[record], patterns] = await Promise.all([
    db
      .select({
        value: settings.value,
      })
      .from(settings)
      .where(eq(settings.key, 'exclusion_enabled')),
    db
      .select({
        id: exclusionPattern.id,
        pattern: exclusionPattern.pattern,
        description: exclusionPattern.description,
        enabled: exclusionPattern.enabled,
      })
      .from(exclusionPattern)
      .orderBy(exclusionPattern.createdAt),
  ])

  return {
    enabled: record?.value ? (JSON.parse(record.value) as boolean) : true,
    patterns: patterns.map((p) => ({
      id: p.id,
      pattern: p.pattern,
      description: p.description || undefined,
      enabled: p.enabled || false,
    })),
  }
}

export async function removeExclusionPattern(id: number) {
  await db.delete(exclusionPattern).where(eq(exclusionPattern.id, id))
}

export async function updateExclusionPattern(id: number, data: Partial<Omit<ExclusionPattern, 'id'>>) {
  const [updated] = await db
    .update(exclusionPattern)
    .set({
      pattern: data.pattern,
      description: data.description,
      enabled: data.enabled,
      updatedAt: new Date(),
    })
    .where(eq(exclusionPattern.id, id))
    .returning({
      id: exclusionPattern.id,
      pattern: exclusionPattern.pattern,
      description: exclusionPattern.description,
      enabled: exclusionPattern.enabled,
    })

  if (!updated) {
    throw new Error('Exclusion pattern not found')
  }

  return {
    id: updated.id,
    pattern: updated.pattern,
    description: updated.description ?? undefined,
    enabled: updated.enabled || false,
  }
}

export async function updateExclusionSettings(data: Partial<ExclusionSettings>) {
  await db
    .insert(settings)
    .values({
      key: 'exclusion_enabled',
      value: JSON.stringify(data.enabled),
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value: JSON.stringify(data.enabled),
        updatedAt: new Date(),
      },
    })
}

'use server'

import { eq } from 'drizzle-orm'

import type { CourierMapping, DuplicateCheckSettings, ExclusionPattern, ExclusionSettings } from '@/services/settings'
import type { CreateTemplateData, ShoppingMallTemplate, UpdateTemplateData } from '@/services/shopping-mall-templates'

import { isUniqueViolation } from '@/common/constants/postgres-errors'
import { db } from '@/db/client'
import { columnSynonym, courierMapping, exclusionPattern, settings, shoppingMallTemplate } from '@/db/schema/settings'
import { type ColumnSynonym, invalidateSynonymCache } from '@/services/column-synonyms'
import { getDuplicateCheckSettings, getExclusionSettings } from '@/services/settings'

export async function addCourierMapping(data: Omit<CourierMapping, 'id'>): Promise<CourierMapping> {
  const [newMapping] = await db
    .insert(courierMapping)
    .values({
      name: data.name,
      code: data.code,
      aliases: data.aliases,
      enabled: data.enabled,
    })
    .returning()

  return {
    id: newMapping.id,
    name: newMapping.name,
    code: newMapping.code,
    aliases: (newMapping.aliases as string[]) || [],
    enabled: newMapping.enabled || false,
  }
}

export async function addExclusionPattern(pattern: Omit<ExclusionPattern, 'id'>): Promise<ExclusionPattern> {
  const [newPattern] = await db
    .insert(exclusionPattern)
    .values({
      pattern: pattern.pattern,
      description: pattern.description,
      enabled: pattern.enabled,
    })
    .returning()

  return {
    id: newPattern.id,
    pattern: newPattern.pattern,
    description: newPattern.description || undefined,
    enabled: newPattern.enabled || false,
  }
}

export async function addSynonym(data: {
  standardKey: string
  synonym: string
}): Promise<ColumnSynonym | { error: string }> {
  try {
    const [newSynonym] = await db
      .insert(columnSynonym)
      .values({
        standardKey: data.standardKey,
        synonym: data.synonym,
        enabled: true,
      })
      .returning()

    await invalidateSynonymCache()

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
    console.error('동의어 추가 에러:', error)
    return { error: '동의어 추가 중 오류가 발생했습니다' }
  }
}

export async function createShoppingMallTemplate(data: CreateTemplateData): Promise<ShoppingMallTemplate> {
  const [created] = await db
    .insert(shoppingMallTemplate)
    .values({
      mallName: data.mallName,
      displayName: data.displayName,
      columnMappings: JSON.stringify(data.columnMappings),
      headerRow: data.headerRow,
      dataStartRow: data.dataStartRow,
      enabled: true,
    })
    .returning()

  return mapToShoppingMallTemplate(created)
}

export async function deleteShoppingMallTemplate(id: number): Promise<void> {
  await db.delete(shoppingMallTemplate).where(eq(shoppingMallTemplate.id, id))
}

export async function removeCourierMapping(id: number): Promise<void> {
  await db.delete(courierMapping).where(eq(courierMapping.id, id))
}

export async function removeExclusionPattern(id: number): Promise<void> {
  await db.delete(exclusionPattern).where(eq(exclusionPattern.id, id))
}

export async function removeSynonym(id: number): Promise<void> {
  await db.delete(columnSynonym).where(eq(columnSynonym.id, id))
  await invalidateSynonymCache()
}

export async function updateCourierMapping(id: number, data: Partial<CourierMapping>): Promise<CourierMapping> {
  const [updated] = await db
    .update(courierMapping)
    .set({
      name: data.name,
      code: data.code,
      aliases: data.aliases,
      enabled: data.enabled,
    })
    .where(eq(courierMapping.id, id))
    .returning()

  if (!updated) throw new Error('Courier mapping not found')

  return {
    id: updated.id,
    name: updated.name,
    code: updated.code,
    aliases: (updated.aliases as string[]) || [],
    enabled: updated.enabled || false,
  }
}

export async function updateDuplicateCheckSettings(
  data: Partial<DuplicateCheckSettings>,
): Promise<DuplicateCheckSettings> {
  const current = await getDuplicateCheckSettings()
  const updated = { ...current, ...data }
  return setSetting('duplicate_check', updated)
}

export async function updateExclusionPattern(
  id: number,
  data: Partial<Omit<ExclusionPattern, 'id'>>,
): Promise<ExclusionPattern> {
  const [updated] = await db
    .update(exclusionPattern)
    .set({
      pattern: data.pattern,
      description: data.description,
      enabled: data.enabled,
      updatedAt: new Date(),
    })
    .where(eq(exclusionPattern.id, id))
    .returning()

  if (!updated) throw new Error('Exclusion pattern not found')

  return {
    id: updated.id,
    pattern: updated.pattern,
    description: updated.description || undefined,
    enabled: updated.enabled || false,
  }
}

export async function updateExclusionSettings(data: Partial<ExclusionSettings>): Promise<ExclusionSettings> {
  if (data.enabled !== undefined) {
    await setSetting('exclusion_enabled', data.enabled)
  }

  return getExclusionSettings()
}

export async function updateShoppingMallTemplate(id: number, data: UpdateTemplateData): Promise<ShoppingMallTemplate> {
  const [updated] = await db
    .update(shoppingMallTemplate)
    .set({
      mallName: data.mallName,
      displayName: data.displayName,
      columnMappings: data.columnMappings ? JSON.stringify(data.columnMappings) : undefined,
      headerRow: data.headerRow,
      dataStartRow: data.dataStartRow,
      enabled: data.enabled,
      updatedAt: new Date(),
    })
    .where(eq(shoppingMallTemplate.id, id))
    .returning()

  if (!updated) throw new Error('Template not found')
  return mapToShoppingMallTemplate(updated)
}

export async function updateSynonym(
  id: number,
  data: Partial<{ enabled: boolean; standardKey: string; synonym: string }>,
): Promise<ColumnSynonym> {
  const [updated] = await db
    .update(columnSynonym)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(columnSynonym.id, id))
    .returning()

  if (!updated) throw new Error('Synonym not found')

  await invalidateSynonymCache()

  return {
    id: updated.id,
    standardKey: updated.standardKey,
    synonym: updated.synonym,
    enabled: updated.enabled ?? true,
  }
}

function mapToShoppingMallTemplate(record: typeof shoppingMallTemplate.$inferSelect): ShoppingMallTemplate {
  let columnMappings: Record<string, string> = {}
  try {
    columnMappings = record.columnMappings ? JSON.parse(record.columnMappings) : {}
  } catch {
    columnMappings = {}
  }

  return {
    id: record.id,
    mallName: record.mallName,
    displayName: record.displayName,
    columnMappings,
    headerRow: record.headerRow || 1,
    dataStartRow: record.dataStartRow || 2,
    enabled: record.enabled ?? true,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

async function setSetting<T>(key: string, value: T, description?: string): Promise<T> {
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

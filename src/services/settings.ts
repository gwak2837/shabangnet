'use server'

import { eq } from 'drizzle-orm'

import { db } from '@/db/client'
import { courierMapping, exclusionPattern, settings } from '@/db/schema/settings'

// Settings types
export interface CourierMapping {
  aliases: string[]
  code: string
  enabled: boolean
  id: string
  name: string
}

export type DuplicateCheckPeriod = 10 | 15 | 20 | 30

export interface DuplicateCheckSettings {
  enabled: boolean
  periodDays: DuplicateCheckPeriod
}

export interface ExclusionPattern {
  description?: string
  displayLabel?: string
  enabled: boolean
  id: string
  pattern: string
}

export interface ExclusionSettings {
  enabled: boolean
  patterns: ExclusionPattern[]
}

// Default values
const defaultDuplicateCheckSettings: DuplicateCheckSettings = {
  enabled: true,
  periodDays: 10,
}

// Courier Mappings
export async function addCourierMapping(data: Omit<CourierMapping, 'id'>): Promise<CourierMapping> {
  const [newMapping] = await db
    .insert(courierMapping)
    .values({
      id: `courier${Date.now()}`,
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

// Exclusion Settings
export async function addExclusionPattern(pattern: Omit<ExclusionPattern, 'id'>): Promise<ExclusionPattern> {
  const [newPattern] = await db
    .insert(exclusionPattern)
    .values({
      id: `exc${Date.now()}`,
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

// Helper function to get courier code from name
export async function getCourierCode(courierName: string): Promise<string | null> {
  const mappings = await getCourierMappings()
  const normalized = courierName.trim()

  for (const courier of mappings) {
    if (!courier.enabled) continue
    if (courier.name === normalized) return courier.code
    if (courier.aliases.some((alias) => alias.toLowerCase() === normalized.toLowerCase())) {
      return courier.code
    }
  }
  return null
}

export async function getCourierMappings(): Promise<CourierMapping[]> {
  const result = await db.select().from(courierMapping).orderBy(courierMapping.name)
  return result.map((m) => ({
    id: m.id,
    name: m.name,
    code: m.code,
    aliases: (m.aliases as string[]) || [],
    enabled: m.enabled || false,
  }))
}

// Duplicate Check Settings
export async function getDuplicateCheckSettings(): Promise<DuplicateCheckSettings> {
  return getSetting<DuplicateCheckSettings>('duplicate_check', defaultDuplicateCheckSettings)
}

// Helper function to get exclusion label
export async function getExclusionLabel(fulfillmentType?: string): Promise<string | null> {
  if (!fulfillmentType) return null

  const exclusionSettings = await getExclusionSettings()
  const matchedPattern = exclusionSettings.patterns.find((p) => p.enabled && fulfillmentType.includes(p.pattern))

  if (!matchedPattern) return null

  return matchedPattern.displayLabel || matchedPattern.description || fulfillmentType
}

export async function getExclusionSettings(): Promise<ExclusionSettings> {
  const enabled = await getSetting<boolean>('exclusion_enabled', true)
  const patterns = await db.select().from(exclusionPattern).orderBy(exclusionPattern.createdAt)

  return {
    enabled,
    patterns: patterns.map((p) => ({
      id: p.id,
      pattern: p.pattern,
      description: p.description || undefined,
      enabled: p.enabled || false,
    })),
  }
}

export async function removeCourierMapping(id: string): Promise<void> {
  await db.delete(courierMapping).where(eq(courierMapping.id, id))
}

export async function removeExclusionPattern(id: string): Promise<void> {
  await db.delete(exclusionPattern).where(eq(exclusionPattern.id, id))
}

export async function updateCourierMapping(id: string, data: Partial<CourierMapping>): Promise<CourierMapping> {
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
  id: string,
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

// Helper to get generic setting
async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const [record] = await db.select().from(settings).where(eq(settings.key, key))
  if (!record || !record.value) return defaultValue
  try {
    return JSON.parse(record.value) as T
  } catch {
    return defaultValue
  }
}

// Helper to set generic setting
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

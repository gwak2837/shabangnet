'use server'

import { eq } from 'drizzle-orm'

import { db } from '@/db/client'
import { courierMapping, exclusionPattern, settings } from '@/db/schema/settings'

// Settings types
export interface CourierMapping {
  aliases: string[]
  code: string
  enabled: boolean
  id: number
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
  id: number
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

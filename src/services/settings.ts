'use server'

import { eq } from 'drizzle-orm'

import { db } from '@/db/client'
import { courierMapping, settings } from '@/db/schema/settings'

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
  const result = await db
    .select({
      id: courierMapping.id,
      name: courierMapping.name,
      code: courierMapping.code,
      aliases: courierMapping.aliases,
      enabled: courierMapping.enabled,
    })
    .from(courierMapping)
    .orderBy(courierMapping.name)

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

// Helper to get generic setting
async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const [record] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, key))
  if (!record || !record.value) return defaultValue
  try {
    return JSON.parse(record.value) as T
  } catch {
    return defaultValue
  }
}

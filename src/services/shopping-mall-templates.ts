'use server'

import { eq } from 'drizzle-orm'

import { db } from '@/db/client'
import { shoppingMallTemplate } from '@/db/schema/settings'
import { parseShoppingMallTemplateColumnConfig } from '@/services/shopping-mall-template-config'

export interface CreateTemplateData {
  columnMappings: Record<string, string>
  dataStartRow: number
  displayName: string
  exportConfig?: ShoppingMallExportConfig | null
  fixedValues?: Record<string, string>
  headerRow: number
  mallName: string
}

export interface ShoppingMallExportColumn {
  header?: string
  id?: string
  source: ShoppingMallExportColumnSource
}

export type ShoppingMallExportColumnSource = { columnIndex: number; type: 'input' } | { type: 'const'; value: string }

export interface ShoppingMallExportConfig {
  columns: ShoppingMallExportColumn[]
  copyPrefixRows?: boolean
}

export interface ShoppingMallTemplate {
  columnMappings: Record<string, string>
  createdAt: string
  dataStartRow: number
  displayName: string
  enabled: boolean
  exportConfig: ShoppingMallExportConfig | null
  fixedValues: Record<string, string>
  headerRow: number
  id: number
  mallName: string
  updatedAt: string
}

export interface UpdateTemplateData {
  columnMappings?: Record<string, string>
  dataStartRow?: number
  displayName?: string
  enabled?: boolean
  exportConfig?: ShoppingMallExportConfig | null
  fixedValues?: Record<string, string>
  headerRow?: number
  mallName?: string
}

// Read operations
export async function getShoppingMallTemplate(id: number): Promise<ShoppingMallTemplate | null> {
  const [result] = await db.select().from(shoppingMallTemplate).where(eq(shoppingMallTemplate.id, id))

  if (!result) return null
  return mapToShoppingMallTemplate(result)
}

export async function getShoppingMallTemplates(): Promise<ShoppingMallTemplate[]> {
  const result = await db.select().from(shoppingMallTemplate).orderBy(shoppingMallTemplate.displayName)
  return result.map(mapToShoppingMallTemplate)
}

// Helper function to map DB record to ShoppingMallTemplate
function mapToShoppingMallTemplate(record: typeof shoppingMallTemplate.$inferSelect): ShoppingMallTemplate {
  let columnMappings: Record<string, string> = {}
  let fixedValues: Record<string, string> = {}
  let exportConfig: ShoppingMallExportConfig | null = null

  try {
    const raw = record.columnMappings ? (JSON.parse(record.columnMappings) as unknown) : {}
    const parsed = parseShoppingMallTemplateColumnConfig(raw)
    columnMappings = parsed.columnMappings
    fixedValues = parsed.fixedValues
  } catch {
    columnMappings = {}
    fixedValues = {}
  }

  try {
    exportConfig = record.exportConfig ? (JSON.parse(record.exportConfig) as ShoppingMallExportConfig) : null
  } catch {
    exportConfig = null
  }

  return {
    id: record.id,
    mallName: record.mallName,
    displayName: record.displayName,
    columnMappings,
    fixedValues,
    headerRow: record.headerRow || 1,
    dataStartRow: record.dataStartRow || 2,
    enabled: record.enabled ?? true,
    exportConfig,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

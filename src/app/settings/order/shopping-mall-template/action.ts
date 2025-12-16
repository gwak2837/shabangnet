'use server'

import { eq } from 'drizzle-orm'

import type { ShoppingMallExportConfig } from '@/services/shopping-mall-templates'

import { db } from '@/db/client'
import { shoppingMallTemplate } from '@/db/schema/settings'
import { parseShoppingMallTemplateColumnConfig, stringifyShoppingMallTemplateColumnConfig } from '@/services/shopping-mall-template-config'

export interface CreateTemplateData {
  columnMappings: Record<string, string>
  dataStartRow: number
  displayName: string
  exportConfig?: ShoppingMallExportConfig | null
  fixedValues?: Record<string, string>
  headerRow: number
  mallName: string
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
  id: number
  mallName?: string
}

export async function addShoppingMallTemplate(data: CreateTemplateData) {
  const [created] = await db
    .insert(shoppingMallTemplate)
    .values({
      mallName: data.mallName,
      displayName: data.displayName,
      columnMappings: stringifyShoppingMallTemplateColumnConfig({
        columnMappings: data.columnMappings,
        fixedValues: data.fixedValues ?? {},
      }),
      exportConfig: data.exportConfig ? JSON.stringify(data.exportConfig) : null,
      headerRow: data.headerRow,
      dataStartRow: data.dataStartRow,
      enabled: true,
    })
    .returning({
      id: shoppingMallTemplate.id,
      mallName: shoppingMallTemplate.mallName,
      displayName: shoppingMallTemplate.displayName,
      columnMappings: shoppingMallTemplate.columnMappings,
      exportConfig: shoppingMallTemplate.exportConfig,
      headerRow: shoppingMallTemplate.headerRow,
      dataStartRow: shoppingMallTemplate.dataStartRow,
      enabled: shoppingMallTemplate.enabled,
      createdAt: shoppingMallTemplate.createdAt,
      updatedAt: shoppingMallTemplate.updatedAt,
    })

  return mapToShoppingMallTemplate(created)
}

export async function removeShoppingMallTemplate(id: number) {
  await db.delete(shoppingMallTemplate).where(eq(shoppingMallTemplate.id, id))
}

export async function updateShoppingMallTemplate(data: UpdateTemplateData) {
  const shouldUpdateColumnConfig = data.columnMappings !== undefined || data.fixedValues !== undefined
  const [existing] = shouldUpdateColumnConfig
    ? await db
        .select({ columnMappings: shoppingMallTemplate.columnMappings })
        .from(shoppingMallTemplate)
        .where(eq(shoppingMallTemplate.id, data.id))
    : []

  const existingConfig = shouldUpdateColumnConfig
    ? (() => {
        try {
          const raw = existing?.columnMappings ? (JSON.parse(existing.columnMappings) as unknown) : {}
          return parseShoppingMallTemplateColumnConfig(raw)
        } catch {
          return { columnMappings: {}, fixedValues: {} }
        }
      })()
    : null

  const [updated] = await db
    .update(shoppingMallTemplate)
    .set({
      mallName: data.mallName,
      displayName: data.displayName,
      columnMappings: shouldUpdateColumnConfig
        ? stringifyShoppingMallTemplateColumnConfig({
            columnMappings: data.columnMappings ?? existingConfig?.columnMappings ?? {},
            fixedValues: data.fixedValues ?? existingConfig?.fixedValues ?? {},
          })
        : undefined,
      exportConfig:
        data.exportConfig !== undefined ? (data.exportConfig ? JSON.stringify(data.exportConfig) : null) : undefined,
      headerRow: data.headerRow,
      dataStartRow: data.dataStartRow,
      enabled: data.enabled,
      updatedAt: new Date(),
    })
    .where(eq(shoppingMallTemplate.id, data.id))
    .returning({
      id: shoppingMallTemplate.id,
      mallName: shoppingMallTemplate.mallName,
      displayName: shoppingMallTemplate.displayName,
      columnMappings: shoppingMallTemplate.columnMappings,
      exportConfig: shoppingMallTemplate.exportConfig,
      headerRow: shoppingMallTemplate.headerRow,
      dataStartRow: shoppingMallTemplate.dataStartRow,
      enabled: shoppingMallTemplate.enabled,
      createdAt: shoppingMallTemplate.createdAt,
      updatedAt: shoppingMallTemplate.updatedAt,
    })

  if (!updated) {
    throw new Error('Template not found')
  }

  return mapToShoppingMallTemplate(updated)
}

function mapToShoppingMallTemplate(record: typeof shoppingMallTemplate.$inferSelect) {
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
    headerRow: record.headerRow ?? 1,
    dataStartRow: record.dataStartRow ?? 2,
    enabled: record.enabled ?? true,
    exportConfig,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

'use server'

import { eq } from 'drizzle-orm'

import type { ShoppingMallExportConfigV1 } from '@/services/shopping-mall-templates'

import { db } from '@/db/client'
import { shoppingMallTemplate } from '@/db/schema/settings'

export interface CreateTemplateData {
  columnMappings: Record<string, string>
  dataStartRow: number
  displayName: string
  exportConfig?: ShoppingMallExportConfigV1 | null
  headerRow: number
  mallName: string
}

export interface ShoppingMallTemplate {
  columnMappings: Record<string, string>
  createdAt: string
  dataStartRow: number
  displayName: string
  enabled: boolean
  exportConfig: ShoppingMallExportConfigV1 | null
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
  exportConfig?: ShoppingMallExportConfigV1 | null
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
      columnMappings: JSON.stringify(data.columnMappings),
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
  const [updated] = await db
    .update(shoppingMallTemplate)
    .set({
      mallName: data.mallName,
      displayName: data.displayName,
      columnMappings: data.columnMappings ? JSON.stringify(data.columnMappings) : undefined,
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
  let exportConfig: ShoppingMallExportConfigV1 | null = null

  try {
    columnMappings = record.columnMappings ? JSON.parse(record.columnMappings) : {}
  } catch {
    columnMappings = {}
  }

  try {
    exportConfig = record.exportConfig ? (JSON.parse(record.exportConfig) as ShoppingMallExportConfigV1) : null
  } catch {
    exportConfig = null
  }

  return {
    id: record.id,
    mallName: record.mallName,
    displayName: record.displayName,
    columnMappings,
    headerRow: record.headerRow ?? 1,
    dataStartRow: record.dataStartRow ?? 2,
    enabled: record.enabled ?? true,
    exportConfig,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

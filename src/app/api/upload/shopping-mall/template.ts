import { eq } from 'drizzle-orm'

import { db } from '@/db/client'
import { shoppingMallTemplate } from '@/db/schema/settings'
import { parseShoppingMallTemplateColumnConfig } from '@/services/shopping-mall-template-config'

import { type ExportConfig, exportConfigSchema } from './types'

export interface ShoppingMallUploadTemplate {
  columnMappings: Record<string, string> // excelHeader -> sabangnetFieldKey
  dataStartRow: number
  displayName: string
  exportConfig: ExportConfig
  fixedValues: Record<string, string>
  headerRow: number
  mallName: string
  rawMallId: number
}

export type ShoppingMallUploadTemplateResult =
  | { ok: false; status: 400 | 500; error: string }
  | { ok: true; template: ShoppingMallUploadTemplate }

export async function getShoppingMallUploadTemplate(mallId: number): Promise<ShoppingMallUploadTemplateResult> {
  const [row] = await db
    .select({
      mallName: shoppingMallTemplate.mallName,
      displayName: shoppingMallTemplate.displayName,
      headerRow: shoppingMallTemplate.headerRow,
      dataStartRow: shoppingMallTemplate.dataStartRow,
      columnMappings: shoppingMallTemplate.columnMappings,
      exportConfig: shoppingMallTemplate.exportConfig,
    })
    .from(shoppingMallTemplate)
    .where(eq(shoppingMallTemplate.id, mallId))

  if (!row) {
    return { ok: false, status: 400, error: '알 수 없는 쇼핑몰이에요' }
  }

  if (!row.exportConfig) {
    return { ok: false, status: 400, error: '다운로드 템플릿이 등록되지 않았어요' }
  }

  const exportConfig = (() => {
    try {
      const raw: unknown = JSON.parse(row.exportConfig)
      const parsed = exportConfigSchema.safeParse(raw)
      if (!parsed.success) {
        return null
      }
      return parsed.data
    } catch {
      return null
    }
  })()

  if (!exportConfig) {
    return { ok: false, status: 500, error: '다운로드 템플릿 형식이 올바르지 않아요' }
  }

  const parsedColumnConfig = (() => {
    if (!row.columnMappings) {
      return null
    }

    try {
      const raw: unknown = JSON.parse(row.columnMappings)
      return parseShoppingMallTemplateColumnConfig(raw)
    } catch {
      return null
    }
  })()

  if (!parsedColumnConfig) {
    return { ok: false, status: 500, error: '업로드 템플릿 형식이 올바르지 않아요' }
  }

  const headerRow = Math.max(1, row.headerRow ?? 1)
  const dataStartRow = Math.max(1, row.dataStartRow ?? 2)

  if (!row.displayName.trim()) {
    return { ok: false, status: 500, error: '쇼핑몰 이름이 비어있어요' }
  }

  return {
    ok: true,
    template: {
      rawMallId: mallId,
      mallName: row.mallName,
      displayName: row.displayName,
      headerRow,
      dataStartRow,
      columnMappings: parsedColumnConfig.columnMappings,
      fixedValues: parsedColumnConfig.fixedValues,
      exportConfig,
    },
  }
}

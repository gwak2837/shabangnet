'use server'

import { eq } from 'drizzle-orm'

import type { TemplateAnalysis } from '@/lib/excel'

import { db } from '@/db/client'
import { commonOrderTemplate } from '@/db/schema/manufacturers'
import { analyzeTemplateStructure } from '@/lib/excel'

import type { CommonOrderTemplate, UpsertCommonOrderTemplateInput } from './order-templates.types'

const COMMON_ORDER_TEMPLATE_KEY = 'default'

export async function analyzeOrderTemplateFile(fileBuffer: ArrayBuffer): Promise<{
  analysis?: TemplateAnalysis
  error?: string
  success: boolean
}> {
  try {
    const analysis = await analyzeTemplateStructure(fileBuffer)
    return { success: true, analysis }
  } catch (error) {
    console.error('analyzeOrderTemplateFile', error)
    return { success: false, error: error instanceof Error ? error.message : '템플릿 분석에 실패했어요' }
  }
}

export async function getCommonOrderTemplate(): Promise<CommonOrderTemplate | null> {
  const [row] = await db
    .select()
    .from(commonOrderTemplate)
    .where(eq(commonOrderTemplate.key, COMMON_ORDER_TEMPLATE_KEY))
    .limit(1)

  if (!row) return null

  let columnMappings: Record<string, string> = {}
  let fixedValues: Record<string, string> | undefined

  try {
    columnMappings = JSON.parse(row.columnMappings) as Record<string, string>
    fixedValues = row.fixedValues ? (JSON.parse(row.fixedValues) as Record<string, string>) : undefined
  } catch {
    // 데이터가 깨진 경우 UI에서 재저장 유도
    columnMappings = {}
    fixedValues = undefined
  }

  return {
    key: row.key,
    templateFileName: row.templateFileName,
    headerRow: row.headerRow,
    dataStartRow: row.dataStartRow,
    columnMappings,
    fixedValues,
  }
}

export async function upsertCommonOrderTemplate(
  input: UpsertCommonOrderTemplateInput,
): Promise<{ error?: string; success: boolean }> {
  const headerRow = Math.max(1, Number(input.headerRow) || 1)
  const dataStartRow = Math.max(1, Number(input.dataStartRow) || 2)

  if (!input.columnMappings || Object.keys(input.columnMappings).length === 0) {
    return { success: false, error: '컬럼 연결이 비어있어요. 최소 1개 이상 설정해 주세요.' }
  }

  const [existing] = await db
    .select({ key: commonOrderTemplate.key })
    .from(commonOrderTemplate)
    .where(eq(commonOrderTemplate.key, COMMON_ORDER_TEMPLATE_KEY))
    .limit(1)

  const fixedValuesJson = input.fixedValues ? JSON.stringify(input.fixedValues) : null
  const columnMappingsJson = JSON.stringify(input.columnMappings)

  if (!existing) {
    if (!input.templateFileBuffer || !input.templateFileName) {
      return { success: false, error: '공통 템플릿 파일을 업로드해 주세요.' }
    }

    const templateFile = Buffer.from(new Uint8Array(input.templateFileBuffer))

    await db.insert(commonOrderTemplate).values({
      key: COMMON_ORDER_TEMPLATE_KEY,
      templateFileName: input.templateFileName,
      templateFile,
      headerRow,
      dataStartRow,
      columnMappings: columnMappingsJson,
      fixedValues: fixedValuesJson,
      updatedAt: new Date(),
    })

    return { success: true }
  }

  const updateSet: Partial<typeof commonOrderTemplate.$inferInsert> = {
    headerRow,
    dataStartRow,
    columnMappings: columnMappingsJson,
    fixedValues: fixedValuesJson,
    updatedAt: new Date(),
  }

  if (input.templateFileBuffer && input.templateFileName) {
    updateSet.templateFileName = input.templateFileName
    updateSet.templateFile = Buffer.from(new Uint8Array(input.templateFileBuffer))
  }

  await db.update(commonOrderTemplate).set(updateSet).where(eq(commonOrderTemplate.key, COMMON_ORDER_TEMPLATE_KEY))

  return { success: true }
}

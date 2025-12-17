'use server'

import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm'

import type { TemplateAnalysis } from '@/lib/excel'

import { db } from '@/db/client'
import { manufacturer, orderTemplate } from '@/db/schema/manufacturers'
import { order } from '@/db/schema/orders'
import { commonOrderTemplate } from '@/db/schema/settings'
import { analyzeTemplateStructure } from '@/lib/excel'
import { orderIsIncludedSql } from '@/services/order-exclusion'

const COMMON_ORDER_TEMPLATE_KEY = 'default'

export interface CommonOrderTemplate {
  columnMappings: Record<string, string>
  dataStartRow: number
  fixedValues?: Record<string, string>
  headerRow: number
  key: string
  templateFileName: string
}

export interface CommonTemplateTestCandidate {
  manufacturerId: number
  manufacturerName: string
  orderCount: number
}

export interface UpsertCommonOrderTemplateInput {
  columnMappings: Record<string, string>
  dataStartRow: number
  fixedValues?: Record<string, string>
  headerRow: number
  templateFileBuffer?: ArrayBuffer
  templateFileName?: string
}

export async function analyzeCurrentCommonOrderTemplate(): Promise<{
  analysis?: TemplateAnalysis
  error?: string
  success: boolean
}> {
  try {
    const [row] = await db
      .select({ templateFile: commonOrderTemplate.templateFile })
      .from(commonOrderTemplate)
      .where(eq(commonOrderTemplate.key, COMMON_ORDER_TEMPLATE_KEY))
      .limit(1)

    if (!row) {
      return { success: false, error: '공통 발주서 템플릿이 아직 없어요. 먼저 파일을 업로드해 주세요.' }
    }

    const analysis = await analyzeTemplateStructure(toArrayBuffer(row.templateFile))
    return { success: true, analysis }
  } catch (error) {
    console.error('analyzeCurrentCommonOrderTemplate', error)
    return { success: false, error: error instanceof Error ? error.message : '템플릿 분석에 실패했어요' }
  }
}

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

/**
 * 공통 템플릿(제조사 템플릿 없음)으로 "실제로 전송될" 발주서를 테스트 다운로드할 수 있는 후보 제조사 목록이에요.
 * - 제조사 템플릿이 유효하지 않은 제조사만 포함돼요.
 * - 제외 주문(fulfillmentType + 제외 패턴)은 제외해요.
 */
export async function getCommonTemplateTestCandidates(): Promise<CommonTemplateTestCandidate[]> {
  const manufacturers = await db
    .select({ id: manufacturer.id, name: manufacturer.name })
    .from(manufacturer)
    .orderBy(manufacturer.name)

  if (manufacturers.length === 0) {
    return []
  }

  const templates = await db
    .select({
      manufacturerId: orderTemplate.manufacturerId,
      templateFile: orderTemplate.templateFile,
      columnMappings: orderTemplate.columnMappings,
    })
    .from(orderTemplate)

  const validTemplateManufacturerIds = new Set<number>()
  for (const t of templates) {
    if (!t.manufacturerId) continue
    if (t.templateFile && hasValidColumnMappings(t.columnMappings)) {
      validTemplateManufacturerIds.add(t.manufacturerId)
    }
  }

  const candidateManufacturerIds = manufacturers.map((m) => m.id).filter((id) => !validTemplateManufacturerIds.has(id))
  if (candidateManufacturerIds.length === 0) return []

  const counts = await db
    .select({
      manufacturerId: order.manufacturerId,
      orderCount: sql<number>`count(*)`.mapWith(Number),
    })
    .from(order)
    .where(
      and(
        isNotNull(order.manufacturerId),
        orderIsIncludedSql(order.fulfillmentType),
        inArray(order.manufacturerId, candidateManufacturerIds),
      ),
    )
    .groupBy(order.manufacturerId)

  const countByManufacturerId = new Map<number, number>()
  for (const c of counts) {
    if (typeof c.manufacturerId === 'number') {
      countByManufacturerId.set(c.manufacturerId, c.orderCount)
    }
  }

  return manufacturers
    .map((m) => ({
      manufacturerId: m.id,
      manufacturerName: m.name,
      orderCount: countByManufacturerId.get(m.id) ?? 0,
    }))
    .filter((m) => m.orderCount > 0)
    .sort((a, b) => b.orderCount - a.orderCount || a.manufacturerName.localeCompare(b.manufacturerName, 'ko'))
}

export async function getRecentOrderIdsForManufacturer(manufacturerId: number, limit: number = 50): Promise<number[]> {
  const safeLimit = Math.min(200, Math.max(1, Math.floor(limit)))

  const rows = await db.query.order.findMany({
    columns: { id: true },
    where: (o, { and: andOp, eq: eqOp }) =>
      andOp(eqOp(o.manufacturerId, manufacturerId), orderIsIncludedSql(o.fulfillmentType)),
    orderBy: (o, { desc: descOp }) => [descOp(o.createdAt)],
    limit: safeLimit,
  })

  return rows.map((r) => r.id)
}

export async function upsertCommonOrderTemplate(
  input: UpsertCommonOrderTemplateInput,
): Promise<{ error?: string; success: boolean }> {
  const headerRow = Math.max(1, Number(input.headerRow) || 1)
  const dataStartRow = Math.max(1, Number(input.dataStartRow) || 2)

  const columnMappings = input.columnMappings ?? {}
  const fixedValues = input.fixedValues ?? {}
  const hasRowRules = Object.keys(columnMappings).length > 0 || hasRowFixedValues(fixedValues)

  if (!hasRowRules) {
    return { success: false, error: '컬럼 설정이 비어있어요. 최소 1개 이상 연결하거나 직접 입력을 추가해 주세요.' }
  }

  const [existing] = await db
    .select({ key: commonOrderTemplate.key })
    .from(commonOrderTemplate)
    .where(eq(commonOrderTemplate.key, COMMON_ORDER_TEMPLATE_KEY))
    .limit(1)

  const fixedValuesJson = Object.keys(fixedValues).length > 0 ? JSON.stringify(fixedValues) : null
  const columnMappingsJson = JSON.stringify(columnMappings)

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

function hasRowFixedValues(fixedValues: Record<string, string> | undefined): boolean {
  if (!fixedValues) return false
  return Object.keys(fixedValues).some((rawKey) => {
    const key = rawKey.trim().toUpperCase()
    return /^[A-Z]+$/.test(key) || /^FIELD\s*:/.test(key)
  })
}

function hasValidColumnMappings(columnMappings: string | null | undefined): boolean {
  if (!columnMappings) return false
  try {
    const parsed = JSON.parse(columnMappings)
    return typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length > 0
  } catch {
    return false
  }
}

function toArrayBuffer(data: Buffer): ArrayBuffer {
  const copy = new Uint8Array(data.byteLength)
  copy.set(data)
  return copy.buffer
}

'use server'

import { count, eq, inArray } from 'drizzle-orm'
import { headers } from 'next/headers'

import { db } from '@/db/client'
import { invoiceTemplate, manufacturer, optionMapping, orderTemplate, product } from '@/db/schema/manufacturers'
import { order, orderEmailLog, orderEmailLogItem } from '@/db/schema/orders'
import { auth } from '@/lib/auth'
import { analyzeTemplateStructure, type TemplateAnalysis } from '@/lib/excel'

interface DeletePreviewResult {
  emailLogCount?: number
  emailLogItemCount?: number
  error?: string
  invoiceTemplateCount?: number
  manufacturerCount?: number
  optionMappingCount?: number
  orderCount?: number
  orderTemplateCount?: number
  productCount?: number
}

interface DeleteResult {
  deletedManufacturerCount?: number
  error?: string
  success?: string
}

interface UpdateManufacturerBundleInput {
  invoiceTemplate?: {
    courierColumn: string
    dataStartRow: number
    headerRow: number
    orderNumberColumn: string
    trackingNumberColumn: string
    useColumnIndex: boolean
  }
  manufacturer?: {
    ccEmail?: string | null
    contactName?: string | null
    email?: string | null
    phone?: string | null
  }
  manufacturerId: number
  orderTemplate?: {
    columnMappings: Record<string, string>
    dataStartRow: number
    fixedValues?: Record<string, string>
    headerRow: number
    templateFileBuffer?: ArrayBuffer
    templateFileName?: string
  }
}

interface UpdateManufacturerBundleResult {
  error?: string
  success: boolean
}

export async function analyzeCurrentManufacturerOrderTemplate(manufacturerId: number): Promise<{
  analysis?: TemplateAnalysis
  error?: string
  success: boolean
}> {
  const id = Number(manufacturerId)
  if (!Number.isFinite(id) || id <= 0) {
    return { success: false, error: '제조사를 선택해 주세요.' }
  }

  try {
    const [row] = await db
      .select({ templateFile: orderTemplate.templateFile })
      .from(orderTemplate)
      .where(eq(orderTemplate.manufacturerId, id))
      .limit(1)

    if (!row || !row.templateFile) {
      return { success: false, error: '제조사 템플릿 파일이 없어요. 필요하면 파일을 업로드해 주세요.' }
    }

    const analysis = await analyzeTemplateStructure(toArrayBuffer(row.templateFile))
    return { success: true, analysis }
  } catch (error) {
    console.error('analyzeCurrentManufacturerOrderTemplate', error)
    return { success: false, error: error instanceof Error ? error.message : '템플릿 분석에 실패했어요' }
  }
}

export async function deleteManufacturers(manufacturerIds: number[]): Promise<DeleteResult> {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return { error: '권한이 없어요.' }
  }

  if (manufacturerIds.length === 0) {
    return { error: '삭제할 제조사를 선택해 주세요.' }
  }

  const ids = Array.from(new Set(manufacturerIds))

  try {
    // 연관 데이터는 FK 정책으로 처리돼요.
    // - 상품/주문/발송 기록: 제조사 연결만 해제돼요 (set null)
    // - 옵션 연결/템플릿: 제조사 삭제와 함께 정리돼요 (cascade)
    const deleted = await db
      .delete(manufacturer)
      .where(inArray(manufacturer.id, ids))
      .returning({ id: manufacturer.id })

    return {
      success: `제조사 ${deleted.length}곳을 삭제했어요. 연결된 상품/주문/발송 기록은 유지돼요.`,
      deletedManufacturerCount: deleted.length,
    }
  } catch (error) {
    console.error('deleteManufacturers:', error)
    return { error: '삭제에 실패했어요. 다시 시도해 주세요.' }
  }
}

export async function getManufacturerDeletePreview(manufacturerIds: number[]): Promise<DeletePreviewResult> {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return { error: '권한이 없어요.' }
  }

  if (manufacturerIds.length === 0) {
    return { error: '삭제할 제조사를 선택해 주세요.' }
  }

  const ids = Array.from(new Set(manufacturerIds))

  try {
    const [
      [manufacturerCountRow],
      [productCountRow],
      [optionMappingCountRow],
      [orderTemplateCountRow],
      [invoiceTemplateCountRow],
      [orderCountRow],
      [emailLogCountRow],
      emailLogIdRows,
    ] = await Promise.all([
      db.select({ count: count() }).from(manufacturer).where(inArray(manufacturer.id, ids)),
      db.select({ count: count() }).from(product).where(inArray(product.manufacturerId, ids)),
      db.select({ count: count() }).from(optionMapping).where(inArray(optionMapping.manufacturerId, ids)),
      db.select({ count: count() }).from(orderTemplate).where(inArray(orderTemplate.manufacturerId, ids)),
      db.select({ count: count() }).from(invoiceTemplate).where(inArray(invoiceTemplate.manufacturerId, ids)),
      db.select({ count: count() }).from(order).where(inArray(order.manufacturerId, ids)),
      db.select({ count: count() }).from(orderEmailLog).where(inArray(orderEmailLog.manufacturerId, ids)),
      db.select({ id: orderEmailLog.id }).from(orderEmailLog).where(inArray(orderEmailLog.manufacturerId, ids)),
    ])

    const emailLogIds = emailLogIdRows.map((r) => r.id)

    const [emailLogItemCountRow] =
      emailLogIds.length > 0
        ? await db
            .select({ count: count() })
            .from(orderEmailLogItem)
            .where(inArray(orderEmailLogItem.emailLogId, emailLogIds))
        : [{ count: 0 }]

    return {
      manufacturerCount: manufacturerCountRow?.count ?? 0,
      productCount: productCountRow?.count ?? 0,
      optionMappingCount: optionMappingCountRow?.count ?? 0,
      orderTemplateCount: orderTemplateCountRow?.count ?? 0,
      invoiceTemplateCount: invoiceTemplateCountRow?.count ?? 0,
      orderCount: orderCountRow?.count ?? 0,
      emailLogCount: emailLogCountRow?.count ?? 0,
      emailLogItemCount: emailLogItemCountRow?.count ?? 0,
    }
  } catch (error) {
    console.error('getManufacturerDeletePreview:', error)
    return { error: '삭제 미리보기에 실패했어요.' }
  }
}

export async function updateManufacturerBundle(
  input: UpdateManufacturerBundleInput,
): Promise<UpdateManufacturerBundleResult> {
  const manufacturerId = Number(input.manufacturerId)
  if (!Number.isFinite(manufacturerId) || manufacturerId <= 0) {
    return { success: false, error: '제조사를 선택해 주세요.' }
  }

  const hasAnyChange = Boolean(input.manufacturer || input.invoiceTemplate || input.orderTemplate)
  if (!hasAnyChange) {
    return { success: false, error: '변경된 내용이 없어요.' }
  }

  try {
    // 한 번에 저장(트랜잭션)해서 "저장 성공=즉시 닫기" UX가 흔들리지 않게 해요.
    await db.transaction(async (tx) => {
      const [mfr] = await tx
        .select({ id: manufacturer.id })
        .from(manufacturer)
        .where(eq(manufacturer.id, manufacturerId))
        .limit(1)

      if (!mfr) {
        throw new Error('제조사를 찾을 수 없어요.')
      }

      if (input.manufacturer) {
        const contactName = normalizeNullableText(input.manufacturer.contactName)
        const email = normalizeNullableText(input.manufacturer.email)
        const ccEmail = normalizeNullableText(input.manufacturer.ccEmail)
        const phone = normalizeNullableText(input.manufacturer.phone)

        validateSingleEmail(email, '이메일')
        validateEmailList(ccEmail, 'CC 이메일')
        validatePhone(phone)

        await tx
          .update(manufacturer)
          .set({
            contactName,
            email,
            ccEmail,
            phone,
            updatedAt: new Date(),
          })
          .where(eq(manufacturer.id, manufacturerId))
      }

      if (input.invoiceTemplate) {
        const normalizedInvoice = normalizeInvoiceTemplateInput(input.invoiceTemplate)

        const [existing] = await tx
          .select({ id: invoiceTemplate.id })
          .from(invoiceTemplate)
          .where(eq(invoiceTemplate.manufacturerId, manufacturerId))
          .limit(1)

        if (existing) {
          await tx
            .update(invoiceTemplate)
            .set({
              orderNumberColumn: normalizedInvoice.orderNumberColumn,
              courierColumn: normalizedInvoice.courierColumn,
              trackingNumberColumn: normalizedInvoice.trackingNumberColumn,
              headerRow: normalizedInvoice.headerRow,
              dataStartRow: normalizedInvoice.dataStartRow,
              useColumnIndex: normalizedInvoice.useColumnIndex,
              updatedAt: new Date(),
            })
            .where(eq(invoiceTemplate.manufacturerId, manufacturerId))
        } else {
          await tx.insert(invoiceTemplate).values({
            manufacturerId,
            orderNumberColumn: normalizedInvoice.orderNumberColumn,
            courierColumn: normalizedInvoice.courierColumn,
            trackingNumberColumn: normalizedInvoice.trackingNumberColumn,
            headerRow: normalizedInvoice.headerRow,
            dataStartRow: normalizedInvoice.dataStartRow,
            useColumnIndex: normalizedInvoice.useColumnIndex,
          })
        }
      }

      if (input.orderTemplate) {
        const normalizedOrder = normalizeOrderTemplateInput(input.orderTemplate)

        const [existing] = await tx
          .select({
            manufacturerId: orderTemplate.manufacturerId,
            templateFile: orderTemplate.templateFile,
          })
          .from(orderTemplate)
          .where(eq(orderTemplate.manufacturerId, manufacturerId))
          .limit(1)

        const hasExistingFile = Boolean(existing?.templateFile)
        const hasUploadedFile = Boolean(normalizedOrder.templateFileBuffer && normalizedOrder.templateFileName)

        if (!existing && !hasUploadedFile) {
          throw new Error('발주서 템플릿 파일을 업로드해 주세요.')
        }

        if (existing && !hasExistingFile && !hasUploadedFile) {
          throw new Error('발주서 템플릿 파일을 업로드해 주세요.')
        }

        const fixedValuesJson =
          normalizedOrder.fixedValues && Object.keys(normalizedOrder.fixedValues).length > 0
            ? JSON.stringify(normalizedOrder.fixedValues)
            : null

        const columnMappingsJson = JSON.stringify(normalizedOrder.columnMappings)

        const updateSet: Partial<typeof orderTemplate.$inferInsert> = {
          headerRow: normalizedOrder.headerRow,
          dataStartRow: normalizedOrder.dataStartRow,
          columnMappings: columnMappingsJson,
          fixedValues: fixedValuesJson,
          updatedAt: new Date(),
        }

        if (hasUploadedFile) {
          updateSet.templateFileName = normalizedOrder.templateFileName!
          updateSet.templateFile = Buffer.from(new Uint8Array(normalizedOrder.templateFileBuffer!))
        }

        if (existing) {
          await tx.update(orderTemplate).set(updateSet).where(eq(orderTemplate.manufacturerId, manufacturerId))
        } else {
          if (!updateSet.templateFile || !updateSet.templateFileName) {
            throw new Error('발주서 템플릿 파일을 업로드해 주세요.')
          }

          await tx.insert(orderTemplate).values({
            manufacturerId,
            templateFileName: updateSet.templateFileName,
            templateFile: updateSet.templateFile,
            headerRow: updateSet.headerRow,
            dataStartRow: updateSet.dataStartRow,
            columnMappings: updateSet.columnMappings,
            fixedValues: updateSet.fixedValues,
            updatedAt: updateSet.updatedAt,
          })
        }
      }
    })

    return { success: true }
  } catch (error) {
    console.error('updateManufacturerBundle', error)
    return { success: false, error: error instanceof Error ? error.message : '저장에 실패했어요. 다시 시도해 주세요.' }
  }
}

async function checkAdminRole(): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() })
  return Boolean(session?.user?.isAdmin)
}

function isEmail(value: string): boolean {
  // 간단한 검증(브라우저/서버 공통): 공백 없이 local@domain.tld 형태만 확인해요.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function normalizeColumnSelector(raw: string, useColumnIndex: boolean, label: string): string {
  const v = String(raw ?? '').trim()
  if (v.length === 0) {
    throw new Error(`송장 템플릿에서 ${label} 값을 입력해 주세요.`)
  }

  if (!useColumnIndex) {
    return v
  }

  const upper = v.toUpperCase()
  if (!/^[A-Z]+$/.test(upper)) {
    throw new Error(`송장 템플릿에서 ${label} 컬럼은 A, B, C 같은 형태로 입력해 주세요.`)
  }

  return upper
}

function normalizeFixedValues(input: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!input) return undefined
  const out: Record<string, string> = {}

  for (const [rawKey, rawValue] of Object.entries(input)) {
    const value = String(rawValue ?? '').trim()
    if (value.length === 0) continue

    const key = String(rawKey ?? '').trim()
    if (key.length === 0) continue

    const normalizedKey = /^[A-Za-z]+$/.test(key) ? key.toUpperCase() : key
    out[normalizedKey] = value
  }

  return Object.keys(out).length > 0 ? out : undefined
}

function normalizeInvoiceTemplateInput(input: UpdateManufacturerBundleInput['invoiceTemplate']): {
  courierColumn: string
  dataStartRow: number
  headerRow: number
  orderNumberColumn: string
  trackingNumberColumn: string
  useColumnIndex: boolean
} {
  if (!input) {
    throw new Error('송장 템플릿을 확인해 주세요.')
  }

  const headerRow = toSafePositiveInt(input.headerRow, 1)
  const dataStartRow = toSafePositiveInt(input.dataStartRow, 2)
  if (dataStartRow <= headerRow) {
    throw new Error('송장 템플릿에서 데이터 시작 행은 헤더 행보다 아래여야 해요.')
  }

  const useColumnIndex = Boolean(input.useColumnIndex)

  const orderNumberColumn = normalizeColumnSelector(input.orderNumberColumn, useColumnIndex, '주문번호')
  const courierColumn = normalizeColumnSelector(input.courierColumn, useColumnIndex, '택배사')
  const trackingNumberColumn = normalizeColumnSelector(input.trackingNumberColumn, useColumnIndex, '송장번호')

  return {
    orderNumberColumn,
    courierColumn,
    trackingNumberColumn,
    headerRow,
    dataStartRow,
    useColumnIndex,
  }
}

function normalizeNullableText(value: string | null | undefined): string | null {
  const v = typeof value === 'string' ? value.trim() : ''
  return v.length > 0 ? v : null
}

function normalizeOrderTemplateInput(input: UpdateManufacturerBundleInput['orderTemplate']): {
  columnMappings: Record<string, string>
  dataStartRow: number
  fixedValues?: Record<string, string>
  headerRow: number
  templateFileBuffer?: ArrayBuffer
  templateFileName?: string
} {
  if (!input) {
    throw new Error('발주서 템플릿을 확인해 주세요.')
  }

  const headerRow = toSafePositiveInt(input.headerRow, 1)
  const dataStartRow = toSafePositiveInt(input.dataStartRow, 2)
  if (dataStartRow <= headerRow) {
    throw new Error('발주서 템플릿에서 데이터 시작 행은 헤더 행보다 아래여야 해요.')
  }

  const columnMappings: Record<string, string> = {}
  const usedColumns = new Set<string>()
  for (const [rawFieldKey, rawColumn] of Object.entries(input.columnMappings ?? {})) {
    const fieldKey = String(rawFieldKey ?? '').trim()
    if (!fieldKey) continue
    const column = String(rawColumn ?? '')
      .trim()
      .toUpperCase()
    if (!/^[A-Z]+$/.test(column)) {
      throw new Error(`발주서 컬럼 연결을 확인해 주세요. (${fieldKey})`)
    }
    if (usedColumns.has(column)) {
      throw new Error(`발주서 템플릿에서 같은 컬럼(${column})이 중복으로 연결돼 있어요.`)
    }
    usedColumns.add(column)
    columnMappings[fieldKey] = column
  }

  if (Object.keys(columnMappings).length === 0) {
    throw new Error('발주서 컬럼 연결이 비어있어요. 최소 1개 이상 연결해 주세요.')
  }

  const fixedValues = normalizeFixedValues(input.fixedValues)

  const templateFileName = typeof input.templateFileName === 'string' ? input.templateFileName.trim() : ''
  const templateFileBuffer = input.templateFileBuffer

  if (templateFileName.length > 0 && !templateFileName.toLowerCase().endsWith('.xlsx')) {
    throw new Error('발주서 템플릿은 xlsx 파일만 업로드할 수 있어요.')
  }

  if (templateFileBuffer && templateFileName.length === 0) {
    throw new Error('발주서 템플릿 파일명을 확인해 주세요.')
  }

  return {
    headerRow,
    dataStartRow,
    columnMappings,
    fixedValues,
    templateFileName: templateFileName.length > 0 ? templateFileName : undefined,
    templateFileBuffer: templateFileBuffer ?? undefined,
  }
}

function toArrayBuffer(data: Buffer): ArrayBuffer {
  const copy = new Uint8Array(data.byteLength)
  copy.set(data)
  return copy.buffer
}

function toSafePositiveInt(value: number, fallback: number): number {
  const n = Number(value)
  const int = Number.isFinite(n) ? Math.floor(n) : NaN
  return Number.isFinite(int) && int > 0 ? int : fallback
}

function validateEmailList(raw: string | null, label: string) {
  if (!raw) return
  const parts = raw
    .split(/[,;]+/g)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  for (const email of parts) {
    if (!isEmail(email)) {
      throw new Error(`${label} 형식을 확인해 주세요.`)
    }
  }
}

function validatePhone(phone: string | null) {
  if (!phone) return
  if (!/^[0-9+\-()\s]+$/.test(phone)) {
    throw new Error('전화번호 형식을 확인해 주세요.')
  }
}

function validateSingleEmail(email: string | null, label: string) {
  if (!email) return
  if (email.includes(',') || email.includes(';')) {
    throw new Error(`${label}은 1개만 입력할 수 있어요.`)
  }
  if (!isEmail(email)) {
    throw new Error(`${label} 형식을 확인해 주세요.`)
  }
}

'use server'

import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm'

import { db } from '@/db/client'
import { manufacturer, orderTemplate } from '@/db/schema/manufacturers'
import { order, orderEmailLog } from '@/db/schema/orders'
import { commonOrderTemplate } from '@/db/schema/settings'
import {
  generateOrderFileName,
  generateTemplateBasedOrderSheet,
  type OrderTemplateConfig,
  type ParsedOrder,
} from '@/lib/excel'
import { orderIsIncludedSql } from '@/services/order-exclusion'

const COMMON_ORDER_TEMPLATE_KEY = 'default'

export type DuplicateCheckPeriod = 10 | 15 | 20 | 30

export interface DuplicateCheckResult {
  duplicateLogs: SendLogSummary[]
  hasDuplicate: boolean
  matchedAddresses: string[]
}

export interface ExcludedReasonBatch {
  orders: Order[]
  reason: string
  totalAmount: number
  totalOrders: number
}

// Order types
export interface Order {
  address: string
  createdAt: string
  customerName: string
  fulfillmentType?: string
  id: number
  manufacturerId: number
  manufacturerName: string
  optionName: string
  orderName?: string
  phone: string
  price: number
  productCode: string
  productName: string
  quantity: number
  sabangnetOrderNumber: string
  status: 'completed' | 'error' | 'pending' | 'processing'
}

export interface OrderBatch {
  email: string
  lastSentAt?: string
  manufacturerId: number
  manufacturerName: string
  orders: Order[]
  status: 'error' | 'pending' | 'ready' | 'sent'
  totalAmount: number
  totalOrders: number
}

export interface SendLogSummary {
  id: number
  manufacturerName: string
  orderCount: number
  recipientAddresses: string[]
  sentAt: string
  totalAmount: number
}

export interface SendOrdersParams {
  duplicateReason?: string
  manufacturerId: number
  orderIds: number[]
}

export interface SendOrdersResult {
  errorMessage?: string
  sentCount: number
  success: boolean
}

export async function checkDuplicate(
  manufacturerId: number,
  recipientAddresses: string[],
  periodDays: DuplicateCheckPeriod = 10,
): Promise<DuplicateCheckResult> {
  const now = new Date()
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)

  const recentLogs = await db
    .select({
      id: orderEmailLog.id,
      manufacturerName: orderEmailLog.manufacturerName,
      orderCount: orderEmailLog.orderCount,
      recipientAddresses: orderEmailLog.recipientAddresses,
      sentAt: orderEmailLog.sentAt,
      totalAmount: orderEmailLog.totalAmount,
    })
    .from(orderEmailLog)
    .where(
      and(
        eq(orderEmailLog.manufacturerId, manufacturerId),
        eq(orderEmailLog.status, 'success'),
        gte(orderEmailLog.sentAt, periodStart),
      ),
    )

  const matchedAddresses: string[] = []
  const duplicateLogs: SendLogSummary[] = []

  for (const log of recentLogs) {
    if (!log.recipientAddresses) continue

    const logAddresses = log.recipientAddresses as string[]
    const matches = recipientAddresses.filter((addr) =>
      logAddresses.some((logAddr) => normalizeAddress(logAddr) === normalizeAddress(addr)),
    )

    if (matches.length > 0) {
      matchedAddresses.push(...matches)
      duplicateLogs.push({
        id: log.id,
        manufacturerName: log.manufacturerName,
        orderCount: log.orderCount || 0,
        recipientAddresses: logAddresses,
        totalAmount: log.totalAmount ?? 0,
        sentAt: log.sentAt?.toISOString() || '',
      })
    }
  }

  const uniqueMatchedAddresses = [...new Set(matchedAddresses)]

  return {
    hasDuplicate: uniqueMatchedAddresses.length > 0,
    duplicateLogs,
    matchedAddresses: uniqueMatchedAddresses,
  }
}

export async function downloadOrderExcel(params: { manufacturerId: number; orderIds: number[] }) {
  const result = await generateOrderExcel(params)

  if ('error' in result) {
    return result
  }

  return {
    fileName: result.fileName,
    base64: result.buffer.toString('base64'),
  }
}

/**
 * 발주서 엑셀 파일 생성 (다운로드용)
 * 이메일 발송 없이 엑셀 파일만 생성
 */
export async function generateOrderExcel(params: {
  manufacturerId: number
  orderIds: number[]
}): Promise<{ buffer: Buffer; fileName: string } | { error: string }> {
  const [mfr] = await db
    .select({ name: manufacturer.name })
    .from(manufacturer)
    .where(eq(manufacturer.id, params.manufacturerId))

  if (!mfr) {
    return { error: '제조사를 찾을 수 없어요' }
  }

  // NOTE: 발주서 생성은 주문의 "대부분 컬럼"을 사용해요.
  // 이 경우 select({ ... })는 지나치게 장황해져서, 의도적으로 전체 컬럼을 조회합니다.
  const ordersToExport = await db
    .select()
    .from(order)
    .where(and(eq(order.manufacturerId, params.manufacturerId), inArray(order.id, params.orderIds)))

  if (ordersToExport.length === 0) {
    return { error: '내보낼 주문이 없어요' }
  }

  const date = new Date()

  // 제조사별 발주서 템플릿 조회
  const [template] = await db
    .select({
      templateFile: orderTemplate.templateFile,
      headerRow: orderTemplate.headerRow,
      dataStartRow: orderTemplate.dataStartRow,
      columnMappings: orderTemplate.columnMappings,
      fixedValues: orderTemplate.fixedValues,
    })
    .from(orderTemplate)
    .where(eq(orderTemplate.manufacturerId, params.manufacturerId))

  const parsedOrders: ParsedOrder[] = ordersToExport.map((o, idx) => ({
    // 주문 식별자
    sabangnetOrderNumber: o.sabangnetOrderNumber,
    mallOrderNumber: o.mallOrderNumber || '',
    subOrderNumber: o.subOrderNumber || '',
    // 상품 정보
    productName: o.productName || '',
    quantity: o.quantity || 1,
    optionName: o.optionName || '',
    productAbbr: o.productAbbr || '',
    productCode: o.productCode || '',
    mallProductNumber: o.mallProductNumber || '',
    modelNumber: o.modelNumber || '',
    // 주문자/수취인
    orderName: o.orderName || '',
    recipientName: o.recipientName || '',
    orderPhone: o.orderPhone || '',
    orderMobile: o.orderMobile || '',
    recipientPhone: o.recipientPhone || '',
    recipientMobile: o.recipientMobile || '',
    // 배송 정보
    postalCode: o.postalCode || '',
    address: o.address || '',
    memo: o.memo || '',
    courier: o.courier || '',
    trackingNumber: o.trackingNumber || '',
    logisticsNote: o.logisticsNote || '',
    // 소스/제조사
    shoppingMall: o.shoppingMall || '',
    manufacturer: mfr.name,
    // 금액
    paymentAmount: o.paymentAmount ?? 0,
    cost: o.cost ?? 0,
    shippingCost: o.shippingCost ?? 0,
    // 주문 메타
    fulfillmentType: o.fulfillmentType || '',
    cjDate: o.cjDate?.toISOString().split('T')[0] || '',
    collectedAt: o.collectedAt?.toISOString() || '',
    // 시스템
    rowIndex: idx + 1,
  }))

  const resolvedTemplate = await resolveOrderTemplate({
    manufacturerTemplate: template,
    manufacturerId: params.manufacturerId,
  })

  if ('error' in resolvedTemplate) {
    return { error: resolvedTemplate.error }
  }

  const excelBuffer = await generateTemplateBasedOrderSheet(
    parsedOrders,
    resolvedTemplate.templateBuffer,
    resolvedTemplate.config,
    mfr.name,
    date,
  )

  const fileName = generateOrderFileName(mfr.name, date)

  return { buffer: excelBuffer, fileName }
}

/**
 * 발주서 엑셀 파일 생성 (다운로드용)
 * - order-ids 없이, 현재 필터 조건으로 DB에서 주문을 조회해요.
 */
export async function generateOrderExcelForDownload(params: {
  dateFrom?: string
  dateTo?: string
  limit?: number
  manufacturerId: number
  search?: string
  status?: 'all' | 'error' | 'pending' | 'sent'
}): Promise<{ buffer: Buffer; fileName: string } | { error: string }> {
  const [mfr] = await db
    .select({ name: manufacturer.name })
    .from(manufacturer)
    .where(eq(manufacturer.id, params.manufacturerId))

  if (!mfr) {
    return { error: '제조사를 찾을 수 없어요' }
  }

  const searchValue = params.search?.trim()
  const searchCondition = searchValue
    ? sql`(
        ${order.sabangnetOrderNumber} ILIKE ${`%${searchValue}%`} OR
        ${order.mallOrderNumber} ILIKE ${`%${searchValue}%`} OR
        ${order.productName} ILIKE ${`%${searchValue}%`} OR
        ${order.recipientName} ILIKE ${`%${searchValue}%`} OR
        ${order.manufacturerName} ILIKE ${`%${searchValue}%`}
      )`
    : undefined

  const dateFromCondition = params.dateFrom ? sql`${order.createdAt} >= ${params.dateFrom}::timestamp` : undefined
  const dateToCondition = params.dateTo
    ? sql`${order.createdAt} <= ${params.dateTo}::timestamp + interval '1 day'`
    : undefined

  const safeLimit = typeof params.limit === 'number' ? Math.min(2000, Math.max(1, Math.floor(params.limit))) : undefined

  const baseQuery = db
    .select({
      id: order.id,
      status: order.status,
      createdAt: order.createdAt,
      sabangnetOrderNumber: order.sabangnetOrderNumber,
      mallOrderNumber: order.mallOrderNumber,
      subOrderNumber: order.subOrderNumber,
      productName: order.productName,
      quantity: order.quantity,
      optionName: order.optionName,
      productAbbr: order.productAbbr,
      productCode: order.productCode,
      mallProductNumber: order.mallProductNumber,
      modelNumber: order.modelNumber,
      orderName: order.orderName,
      recipientName: order.recipientName,
      orderPhone: order.orderPhone,
      orderMobile: order.orderMobile,
      recipientPhone: order.recipientPhone,
      recipientMobile: order.recipientMobile,
      postalCode: order.postalCode,
      address: order.address,
      memo: order.memo,
      courier: order.courier,
      trackingNumber: order.trackingNumber,
      logisticsNote: order.logisticsNote,
      shoppingMall: order.shoppingMall,
      paymentAmount: order.paymentAmount,
      cost: order.cost,
      shippingCost: order.shippingCost,
      fulfillmentType: order.fulfillmentType,
      cjDate: order.cjDate,
      collectedAt: order.collectedAt,
    })
    .from(order)
    .where(
      and(
        eq(order.manufacturerId, params.manufacturerId),
        orderIsIncludedSql(order.fulfillmentType),
        searchCondition,
        dateFromCondition,
        dateToCondition,
      ),
    )
    .orderBy(desc(order.createdAt), desc(order.id))

  const ordersToExport = safeLimit ? await baseQuery.limit(safeLimit) : await baseQuery

  if (ordersToExport.length === 0) {
    return { error: '내보낼 주문이 없어요' }
  }

  // /api/orders 의 배치 상태 계산과 동일하게 동작하게 해요.
  const hasError = ordersToExport.some((o) => o.status === 'error')
  const allCompleted = ordersToExport.every((o) => o.status === 'completed')
  const batchStatus: 'error' | 'pending' | 'sent' = hasError ? 'error' : allCompleted ? 'sent' : 'pending'

  if (params.status && params.status !== 'all' && params.status !== batchStatus) {
    return { error: '현재 필터에 맞는 발주서가 없어요' }
  }

  const date = new Date()

  // 제조사별 발주서 템플릿 조회
  const [template] = await db
    .select({
      templateFile: orderTemplate.templateFile,
      headerRow: orderTemplate.headerRow,
      dataStartRow: orderTemplate.dataStartRow,
      columnMappings: orderTemplate.columnMappings,
      fixedValues: orderTemplate.fixedValues,
    })
    .from(orderTemplate)
    .where(eq(orderTemplate.manufacturerId, params.manufacturerId))

  const parsedOrders: ParsedOrder[] = ordersToExport.map((o, idx) => ({
    // 주문 식별자
    sabangnetOrderNumber: o.sabangnetOrderNumber,
    mallOrderNumber: o.mallOrderNumber || '',
    subOrderNumber: o.subOrderNumber || '',
    // 상품 정보
    productName: o.productName || '',
    quantity: o.quantity || 1,
    optionName: o.optionName || '',
    productAbbr: o.productAbbr || '',
    productCode: o.productCode || '',
    mallProductNumber: o.mallProductNumber || '',
    modelNumber: o.modelNumber || '',
    // 주문자/수취인
    orderName: o.orderName || '',
    recipientName: o.recipientName || '',
    orderPhone: o.orderPhone || '',
    orderMobile: o.orderMobile || '',
    recipientPhone: o.recipientPhone || '',
    recipientMobile: o.recipientMobile || '',
    // 배송 정보
    postalCode: o.postalCode || '',
    address: o.address || '',
    memo: o.memo || '',
    courier: o.courier || '',
    trackingNumber: o.trackingNumber || '',
    logisticsNote: o.logisticsNote || '',
    // 소스/제조사
    shoppingMall: o.shoppingMall || '',
    manufacturer: mfr.name,
    // 금액
    paymentAmount: o.paymentAmount ?? 0,
    cost: o.cost ?? 0,
    shippingCost: o.shippingCost ?? 0,
    // 주문 메타
    fulfillmentType: o.fulfillmentType || '',
    cjDate: o.cjDate?.toISOString().split('T')[0] || '',
    collectedAt: o.collectedAt?.toISOString() || '',
    // 시스템
    rowIndex: idx + 1,
  }))

  const resolvedTemplate = await resolveOrderTemplate({
    manufacturerTemplate: template,
    manufacturerId: params.manufacturerId,
  })

  if ('error' in resolvedTemplate) {
    return { error: resolvedTemplate.error }
  }

  const excelBuffer = await generateTemplateBasedOrderSheet(
    parsedOrders,
    resolvedTemplate.templateBuffer,
    resolvedTemplate.config,
    mfr.name,
    date,
  )

  const fileName = generateOrderFileName(mfr.name, date)

  return { buffer: excelBuffer, fileName }
}

function hasRowFixedValues(fixedValues: Record<string, string> | undefined): boolean {
  if (!fixedValues) return false
  return Object.keys(fixedValues).some((rawKey) => {
    const key = rawKey.trim().toUpperCase()
    return /^[A-Z]+$/.test(key) || /^FIELD\s*:/.test(key)
  })
}

/**
 * 템플릿의 columnMappings가 유효한지 확인
 * - null/undefined/빈 문자열/빈 객체("{}")인 경우 false 반환
 * - 유효한 연결이 있는 경우 true 반환
 */
function hasValidColumnMappings(columnMappings: string | null | undefined): boolean {
  if (!columnMappings) return false
  try {
    const parsed = JSON.parse(columnMappings)
    return typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length > 0
  } catch {
    return false
  }
}

// Helper function to normalize address for comparison
function normalizeAddress(address: string): string {
  return address.replace(/\s+/g, '').replace(/[,.-]/g, '').toLowerCase()
}

async function resolveOrderTemplate(params: {
  manufacturerId: number
  manufacturerTemplate:
    | Pick<
        typeof orderTemplate.$inferSelect,
        'columnMappings' | 'dataStartRow' | 'fixedValues' | 'headerRow' | 'templateFile'
      >
    | undefined
}): Promise<{ config: OrderTemplateConfig; templateBuffer: ArrayBuffer } | { error: string }> {
  // 1) 제조사 템플릿(파일 + 연결)이 유효하면 최우선
  const mfrTemplate = params.manufacturerTemplate

  if (mfrTemplate && hasValidColumnMappings(mfrTemplate.columnMappings) && mfrTemplate.templateFile) {
    const config: OrderTemplateConfig = {
      headerRow: mfrTemplate.headerRow || 1,
      dataStartRow: mfrTemplate.dataStartRow || 2,
      columnMappings: JSON.parse(mfrTemplate.columnMappings!) as Record<string, string>,
      fixedValues: mfrTemplate.fixedValues
        ? (JSON.parse(mfrTemplate.fixedValues) as Record<string, string>)
        : undefined,
    }

    return { config, templateBuffer: toArrayBuffer(mfrTemplate.templateFile) }
  }

  // 2) 공통 템플릿(전사 1개) 사용
  const [common] = await db
    .select({
      templateFile: commonOrderTemplate.templateFile,
      headerRow: commonOrderTemplate.headerRow,
      dataStartRow: commonOrderTemplate.dataStartRow,
      columnMappings: commonOrderTemplate.columnMappings,
      fixedValues: commonOrderTemplate.fixedValues,
    })
    .from(commonOrderTemplate)
    .where(eq(commonOrderTemplate.key, COMMON_ORDER_TEMPLATE_KEY))

  if (!common) {
    return { error: '발주서 템플릿이 설정되지 않았어요. 설정 > 발주 설정에서 템플릿을 업로드해 주세요.' }
  }

  let columnMappings: Record<string, string> = {}
  try {
    columnMappings = JSON.parse(common.columnMappings) as Record<string, string>
  } catch {
    return { error: '발주서 템플릿 컬럼 연결이 올바르지 않아요. 설정에서 다시 저장해 주세요.' }
  }

  let fixedValues: Record<string, string> | undefined
  if (common.fixedValues) {
    try {
      fixedValues = JSON.parse(common.fixedValues) as Record<string, string>
    } catch {
      return { error: '발주서 템플릿 고정값이 올바르지 않아요. 설정에서 다시 저장해 주세요.' }
    }
  }

  const hasRowRules = Object.keys(columnMappings).length > 0 || hasRowFixedValues(fixedValues)
  if (!hasRowRules) {
    return { error: '발주서 템플릿 컬럼 설정이 비어있어요. 설정에서 컬럼을 연결하거나 직접 입력을 추가해 주세요.' }
  }

  const config: OrderTemplateConfig = {
    headerRow: common.headerRow || 1,
    dataStartRow: common.dataStartRow || 2,
    columnMappings,
    fixedValues,
  }

  return { config, templateBuffer: toArrayBuffer(common.templateFile) }
}

function toArrayBuffer(data: Buffer): ArrayBuffer {
  const copy = new Uint8Array(data.byteLength)
  copy.set(data)
  return copy.buffer
}

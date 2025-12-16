'use server'

import { eq, inArray } from 'drizzle-orm'

import { db } from '@/db/client'
import { commonOrderTemplate, manufacturer, orderTemplate } from '@/db/schema/manufacturers'
import { order } from '@/db/schema/orders'
import {
  generateOrderFileName,
  generateTemplateBasedOrderSheet,
  type OrderTemplateConfig,
  type ParsedOrder,
} from '@/lib/excel'

const COMMON_ORDER_TEMPLATE_KEY = 'default'

export type DuplicateCheckPeriod = 10 | 15 | 20 | 30

export interface DuplicateCheckResult {
  duplicateLogs: SendLogSummary[]
  hasDuplicate: boolean
  matchedAddresses: string[]
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

  const recentLogs = await db.query.orderEmailLog.findMany({
    columns: {
      id: true,
      manufacturerName: true,
      orderCount: true,
      recipientAddresses: true,
      sentAt: true,
      totalAmount: true,
    },
    where: (logs, { and, eq, gte }) =>
      and(eq(logs.manufacturerId, manufacturerId), eq(logs.status, 'success'), gte(logs.sentAt, periodStart)),
  })

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
  const mfr = await db.query.manufacturer.findFirst({
    where: eq(manufacturer.id, params.manufacturerId),
  })

  if (!mfr) {
    return { error: '제조사를 찾을 수 없어요' }
  }

  const ordersToExport = await db.query.order.findMany({
    where: inArray(order.id, params.orderIds),
  })

  if (ordersToExport.length === 0) {
    return { error: '내보낼 주문이 없어요' }
  }

  const date = new Date()

  // 제조사별 발주서 템플릿 조회
  const template = await db.query.orderTemplate.findFirst({
    where: eq(orderTemplate.manufacturerId, params.manufacturerId),
  })

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
    fulfillmentType: o.fulfillmentType || o.excludedReason || '',
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

export async function getExcludedBatches(): Promise<OrderBatch[]> {
  // excludedReason이 설정된 주문만 조회
  const allOrders = await db.query.order.findMany({
    with: {
      manufacturer: true,
    },
    where: (order, { and, isNotNull }) => and(isNotNull(order.manufacturerId), isNotNull(order.excludedReason)),
  })

  const batchesMap = new Map<number, OrderBatch>()
  const allManufacturers = await db
    .select({
      id: manufacturer.id,
      name: manufacturer.name,
      email: manufacturer.email,
    })
    .from(manufacturer)

  for (const m of allManufacturers) {
    batchesMap.set(m.id, {
      manufacturerId: m.id,
      manufacturerName: m.name,
      email: m.email ?? '',
      orders: [],
      status: 'pending',
      totalAmount: 0,
      totalOrders: 0,
    })
  }

  for (const o of allOrders) {
    if (!o.manufacturerId) continue

    const batch = batchesMap.get(o.manufacturerId)
    if (batch) {
      batch.orders.push({
        id: o.id,
        sabangnetOrderNumber: o.sabangnetOrderNumber,
        customerName: o.recipientName || '',
        phone: o.recipientMobile || o.recipientPhone || '',
        address: o.address || '',
        productCode: o.productCode || '',
        productName: o.productName || '',
        optionName: o.optionName || '',
        quantity: o.quantity || 0,
        price: o.paymentAmount ?? 0,
        manufacturerId: o.manufacturerId,
        manufacturerName: o.manufacturerName || '',
        status: o.status as Order['status'],
        createdAt: o.createdAt.toISOString(),
        fulfillmentType: o.fulfillmentType || o.shoppingMall || '',
      })
    }
  }

  for (const batch of batchesMap.values()) {
    batch.totalOrders = batch.orders.length
    batch.totalAmount = batch.orders.reduce((sum, o) => sum + o.price * o.quantity, 0)
  }

  return Array.from(batchesMap.values()).filter((b) => b.totalOrders > 0)
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
  manufacturerTemplate: typeof orderTemplate.$inferSelect | undefined
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
  const common = await db.query.commonOrderTemplate.findFirst({
    where: eq(commonOrderTemplate.key, COMMON_ORDER_TEMPLATE_KEY),
  })

  if (!common) {
    return { error: '공통 발주서 템플릿이 설정되지 않았어요. 설정 > 발주 설정에서 템플릿을 업로드해 주세요.' }
  }

  let columnMappings: Record<string, string> = {}
  try {
    columnMappings = JSON.parse(common.columnMappings) as Record<string, string>
  } catch {
    return { error: '공통 발주서 템플릿 컬럼 연결이 올바르지 않아요. 설정에서 다시 저장해 주세요.' }
  }

  let fixedValues: Record<string, string> | undefined
  if (common.fixedValues) {
    try {
      fixedValues = JSON.parse(common.fixedValues) as Record<string, string>
    } catch {
      return { error: '공통 발주서 템플릿 고정값이 올바르지 않아요. 설정에서 다시 저장해 주세요.' }
    }
  }

  const hasRowRules = Object.keys(columnMappings).length > 0 || hasRowFixedValues(fixedValues)
  if (!hasRowRules) {
    return { error: '공통 발주서 템플릿 컬럼 설정이 비어있어요. 설정에서 컬럼을 연결하거나 직접 입력을 추가해 주세요.' }
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

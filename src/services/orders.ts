'use server'

import { eq, inArray } from 'drizzle-orm'

import { db } from '@/db/client'
import { manufacturer, orderTemplate } from '@/db/schema/manufacturers'
import { order } from '@/db/schema/orders'
import {
  generateOrderFileName,
  generateOrderSheet,
  generateTemplateBasedOrderSheet,
  type OrderData,
  type OrderTemplateConfig,
  type ParsedOrder,
} from '@/lib/excel'

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
  orderNumber: string
  phone: string
  price: number
  productCode: string
  productName: string
  quantity: number
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
    return { error: '제조사를 찾을 수 없습니다' }
  }

  const ordersToExport = await db.query.order.findMany({
    where: inArray(order.id, params.orderIds),
  })

  if (ordersToExport.length === 0) {
    return { error: '내보낼 주문이 없습니다' }
  }

  const date = new Date()

  // 제조사별 발주서 템플릿 조회
  const template = await db.query.orderTemplate.findFirst({
    where: eq(orderTemplate.manufacturerId, params.manufacturerId),
  })

  let excelBuffer: Buffer

  // 유효한 템플릿 설정이 있으면 템플릿 기반으로 생성, 없으면 기본 다온발주양식 사용
  if (hasValidColumnMappings(template?.columnMappings)) {
    // 템플릿 설정이 있으면 템플릿 기반으로 생성
    const templateConfig: OrderTemplateConfig = {
      headerRow: template!.headerRow || 1,
      dataStartRow: template!.dataStartRow || 2,
      columnMappings: JSON.parse(template!.columnMappings!) as Record<string, string>,
      fixedValues: template!.fixedValues ? (JSON.parse(template!.fixedValues) as Record<string, string>) : undefined,
    }

    const parsedOrders: ParsedOrder[] = ordersToExport.map((o, idx) => ({
      orderNumber: o.orderNumber,
      productName: o.productName || '',
      quantity: o.quantity || 1,
      orderName: o.orderName || '',
      recipientName: o.recipientName || '',
      orderPhone: o.orderPhone || '',
      orderMobile: o.orderMobile || '',
      recipientPhone: o.recipientPhone || '',
      recipientMobile: o.recipientMobile || '',
      postalCode: o.postalCode || '',
      address: o.address || '',
      memo: o.memo || '',
      fulfillmentType: o.excludedReason || '',
      shoppingMall: o.shoppingMall || '',
      manufacturer: mfr.name,
      courier: o.courier || '',
      trackingNumber: o.trackingNumber || '',
      optionName: o.optionName || '',
      paymentAmount: o.paymentAmount ?? 0,
      productAbbr: o.productAbbr || '',
      productCode: o.productCode || '',
      cost: o.cost ?? 0,
      shippingCost: o.shippingCost ?? 0,
      rowIndex: idx + 1,
    }))

    excelBuffer = await generateTemplateBasedOrderSheet(parsedOrders, null, templateConfig, mfr.name, date)
  } else {
    // 기본 다온발주양식으로 생성 (템플릿이 없거나 유효하지 않은 경우)
    const orderData: OrderData[] = ordersToExport.map((o) => ({
      orderNumber: o.orderNumber,
      customerName: o.recipientName || '',
      orderName: o.orderName || undefined,
      phone: o.recipientMobile || o.recipientPhone || '',
      address: o.address || '',
      productCode: o.productCode || '',
      productName: o.productName || '',
      optionName: o.optionName || '',
      quantity: o.quantity || 1,
      price: o.paymentAmount ?? 0,
      memo: o.memo || undefined,
    }))

    excelBuffer = await generateOrderSheet({
      manufacturerName: mfr.name,
      orders: orderData,
      date,
    })
  }

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
      email: m.email,
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
        orderNumber: o.orderNumber,
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
        fulfillmentType: o.courier || o.shoppingMall || '', // courier에 fulfillmentType이 저장됨
      })
    }
  }

  for (const batch of batchesMap.values()) {
    batch.totalOrders = batch.orders.length
    batch.totalAmount = batch.orders.reduce((sum, o) => sum + o.price * o.quantity, 0)
  }

  return Array.from(batchesMap.values()).filter((b) => b.totalOrders > 0)
}

/**
 * 템플릿의 columnMappings가 유효한지 확인
 * - null/undefined/빈 문자열/빈 객체("{}")인 경우 false 반환
 * - 유효한 매핑이 있는 경우 true 반환
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

'use server'

import { eq, inArray } from 'drizzle-orm'

import { db } from '@/db/client'
import { manufacturer, orderTemplate } from '@/db/schema/manufacturers'
import { order, orderEmailLog, orderEmailLogItem } from '@/db/schema/orders'
import { sendEmail } from '@/lib/email/send'
import {
  formatDateForFileName,
  generateOrderFileName,
  generateOrderSheet,
  generateTemplateBasedOrderSheet,
  type OrderData,
  type OrderTemplateConfig,
  type ParsedOrder,
} from '@/lib/excel'

import { getExclusionSettings } from './settings'

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
  id: string
  manufacturerId: string
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
  manufacturerId: string
  manufacturerName: string
  orders: Order[]
  status: 'error' | 'pending' | 'ready' | 'sent'
  totalAmount: number
  totalOrders: number
}

export interface SendLogSummary {
  id: string
  manufacturerName: string
  orderCount: number
  recipientAddresses: string[]
  sentAt: string
  totalAmount: number
}

export interface SendOrdersParams {
  duplicateReason?: string
  manufacturerId: string
  orderIds: string[]
}

export interface SendOrdersResult {
  errorMessage?: string
  sentCount: number
  success: boolean
}

export async function checkDuplicate(
  manufacturerId: string,
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
        totalAmount: Number(log.totalAmount || 0),
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

/**
 * 발주서 엑셀 파일 생성 (다운로드용)
 * 이메일 발송 없이 엑셀 파일만 생성
 */
export async function generateOrderExcel(params: {
  manufacturerId: string
  orderIds: string[]
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

  if (template?.columnMappings) {
    // 템플릿 설정이 있으면 템플릿 기반으로 생성
    const templateConfig: OrderTemplateConfig = {
      headerRow: template.headerRow || 1,
      dataStartRow: template.dataStartRow || 2,
      columnMappings: JSON.parse(template.columnMappings) as Record<string, string>,
      fixedValues: template.fixedValues ? (JSON.parse(template.fixedValues) as Record<string, string>) : undefined,
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
      shoppingMall: o.shoppingMall || '',
      manufacturer: mfr.name,
      courier: o.courier || '',
      trackingNumber: o.trackingNumber || '',
      optionName: o.optionName || '',
      paymentAmount: Number(o.paymentAmount || 0),
      productAbbr: o.productAbbr || '',
      productCode: o.productCode || '',
      cost: Number(o.cost || 0),
      shippingCost: Number(o.shippingCost || 0),
      rowIndex: idx + 1,
    }))

    excelBuffer = await generateTemplateBasedOrderSheet(parsedOrders, null, templateConfig, mfr.name, date)
  } else {
    // 기본 양식으로 생성
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
      price: Number(o.paymentAmount || 0),
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

export async function getBatches(): Promise<OrderBatch[]> {
  const allOrders = await db.query.order.findMany({
    with: {
      manufacturer: true,
    },
    where: (order, { isNotNull }) => isNotNull(order.manufacturerId),
  })

  const batchesMap = new Map<string, OrderBatch>()
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

    const isExcluded = await shouldExcludeFromEmail(o.shoppingMall ?? o.courier ?? undefined)
    if (isExcluded) continue

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
        price: Number(o.paymentAmount || 0),
        manufacturerId: o.manufacturerId,
        manufacturerName: o.manufacturerName || '',
        status: o.status as Order['status'],
        createdAt: o.createdAt.toISOString(),
        fulfillmentType: o.shoppingMall || '',
      })
    }
  }

  for (const batch of batchesMap.values()) {
    batch.totalOrders = batch.orders.length
    batch.totalAmount = batch.orders.reduce((sum, o) => sum + o.price * o.quantity, 0)

    if (batch.orders.some((o) => o.status === 'error')) {
      batch.status = 'error'
    } else if (batch.orders.length > 0 && batch.orders.every((o) => o.status === 'completed')) {
      batch.status = 'sent'
    } else {
      batch.status = 'pending'
    }
  }

  return Array.from(batchesMap.values())
}

export async function getExcludedBatches(): Promise<OrderBatch[]> {
  const allOrders = await db.query.order.findMany({
    with: {
      manufacturer: true,
    },
    where: (order, { isNotNull }) => isNotNull(order.manufacturerId),
  })

  const batchesMap = new Map<string, OrderBatch>()
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

    const isExcluded = await shouldExcludeFromEmail(o.shoppingMall ?? o.courier ?? undefined)
    if (!isExcluded) continue

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
        price: Number(o.paymentAmount || 0),
        manufacturerId: o.manufacturerId,
        manufacturerName: o.manufacturerName || '',
        status: o.status as Order['status'],
        createdAt: o.createdAt.toISOString(),
        fulfillmentType: o.shoppingMall || '',
      })
    }
  }

  for (const batch of batchesMap.values()) {
    batch.totalOrders = batch.orders.length
    batch.totalAmount = batch.orders.reduce((sum, o) => sum + o.price * o.quantity, 0)
  }

  return Array.from(batchesMap.values()).filter((b) => b.totalOrders > 0)
}

export async function sendOrders(params: SendOrdersParams): Promise<SendOrdersResult> {
  const mfr = await db.query.manufacturer.findFirst({
    where: eq(manufacturer.id, params.manufacturerId),
  })

  if (!mfr) {
    return { success: false, sentCount: 0, errorMessage: '제조사를 찾을 수 없습니다' }
  }

  const ordersToSend = await db.query.order.findMany({
    where: inArray(order.id, params.orderIds),
  })

  if (ordersToSend.length === 0) {
    return { success: false, sentCount: 0, errorMessage: '발송할 주문이 없습니다' }
  }

  const totalAmount = ordersToSend.reduce((sum, o) => sum + Number(o.paymentAmount || 0) * (o.quantity || 1), 0)
  const totalQuantity = ordersToSend.reduce((sum, o) => sum + (o.quantity || 1), 0)
  const recipientAddresses = ordersToSend.map((o) => o.address || '').filter(Boolean)
  const date = new Date()

  // 1. 제조사별 발주서 템플릿 조회
  const template = await db.query.orderTemplate.findFirst({
    where: eq(orderTemplate.manufacturerId, params.manufacturerId),
  })

  // 2. 발주서 엑셀 파일 생성
  let excelBuffer: Buffer

  if (template?.columnMappings) {
    // 템플릿 설정이 있으면 템플릿 기반으로 생성
    const templateConfig: OrderTemplateConfig = {
      headerRow: template.headerRow || 1,
      dataStartRow: template.dataStartRow || 2,
      columnMappings: JSON.parse(template.columnMappings) as Record<string, string>,
      fixedValues: template.fixedValues ? (JSON.parse(template.fixedValues) as Record<string, string>) : undefined,
    }

    const parsedOrders: ParsedOrder[] = ordersToSend.map((o, idx) => ({
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
      shoppingMall: o.shoppingMall || '',
      manufacturer: mfr.name,
      courier: o.courier || '',
      trackingNumber: o.trackingNumber || '',
      optionName: o.optionName || '',
      paymentAmount: Number(o.paymentAmount || 0),
      productAbbr: o.productAbbr || '',
      productCode: o.productCode || '',
      cost: Number(o.cost || 0),
      shippingCost: Number(o.shippingCost || 0),
      rowIndex: idx + 1,
    }))

    excelBuffer = await generateTemplateBasedOrderSheet(
      parsedOrders,
      null, // 템플릿 파일 없이 동적 생성
      templateConfig,
      mfr.name,
      date,
    )
  } else {
    // 기본 양식으로 생성
    const orderData: OrderData[] = ordersToSend.map((o) => ({
      orderNumber: o.orderNumber,
      customerName: o.recipientName || '',
      orderName: o.orderName || undefined,
      phone: o.recipientMobile || o.recipientPhone || '',
      address: o.address || '',
      productCode: o.productCode || '',
      productName: o.productName || '',
      optionName: o.optionName || '',
      quantity: o.quantity || 1,
      price: Number(o.paymentAmount || 0),
      memo: o.memo || undefined,
    }))

    excelBuffer = await generateOrderSheet({
      manufacturerName: mfr.name,
      orders: orderData,
      date,
    })
  }

  // 3. 이메일 제목/본문 생성
  const emailSubject = (mfr.emailSubjectTemplate || '[다온에프앤씨 발주서]_{제조사명}_{날짜}')
    .replace('{제조사명}', mfr.name)
    .replace('{날짜}', formatDateForFileName(date))

  const emailBody = generateEmailBody(
    mfr.emailBodyTemplate || '안녕하세요. (주)다온에프앤씨 발주 첨부파일 드립니다. 감사합니다.',
    {
      manufacturerName: mfr.name,
      orderCount: ordersToSend.length,
      totalQuantity,
      totalAmount,
      date,
    },
  )

  // 4. CC 이메일 처리 (콤마로 구분된 복수 이메일 지원)
  const ccEmails = mfr.ccEmail
    ? mfr.ccEmail
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean)
    : undefined

  // 5. 이메일 발송 (skipLogging: true로 systemEmailLog에 중복 기록 방지)
  const fileName = generateOrderFileName(mfr.name, date)
  const emailResult = await sendEmail({
    to: mfr.email,
    cc: ccEmails,
    subject: emailSubject,
    html: emailBody,
    attachments: [
      {
        filename: fileName,
        content: excelBuffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    ],
    skipLogging: true, // orderEmailLog에만 기록
  })

  // 6. DB 트랜잭션으로 로그 저장 및 주문 상태 업데이트
  const logId = `log_${Date.now()}`

  return await db.transaction(async (tx) => {
    // 이메일 로그 저장
    await tx.insert(orderEmailLog).values({
      id: logId,
      manufacturerId: mfr.id,
      manufacturerName: mfr.name,
      email: mfr.email,
      subject: emailSubject,
      fileName,
      orderCount: ordersToSend.length,
      totalAmount: totalAmount.toString(),
      status: emailResult.success ? 'success' : 'failed',
      errorMessage: emailResult.error || null,
      recipientAddresses,
      duplicateReason: params.duplicateReason || null,
      sentAt: new Date(),
      sentBy: 'system',
    })

    // 이메일 로그 상세 (주문 정보) 저장
    for (const o of ordersToSend) {
      await tx.insert(orderEmailLogItem).values({
        id: `elo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        emailLogId: logId,
        orderNumber: o.orderNumber,
        productName: o.productName || '',
        optionName: o.optionName || null,
        quantity: o.quantity || 1,
        price: o.paymentAmount?.toString() || '0',
        cost: o.cost?.toString() || '0',
        shippingCost: o.shippingCost?.toString() || '0',
        customerName: o.recipientName || null,
        address: o.address || null,
      })
    }

    // 주문 상태 업데이트
    if (emailResult.success) {
      await tx.update(order).set({ status: 'completed' }).where(inArray(order.id, params.orderIds))
    } else {
      await tx.update(order).set({ status: 'error' }).where(inArray(order.id, params.orderIds))
    }

    if (emailResult.success) {
      return { success: true, sentCount: ordersToSend.length }
    } else {
      return { success: false, sentCount: 0, errorMessage: emailResult.error || '이메일 발송 실패' }
    }
  })
}

/**
 * 이메일 본문 생성 (주문 요약 포함)
 */
function generateEmailBody(
  template: string,
  data: {
    date: Date
    manufacturerName: string
    orderCount: number
    totalAmount: number
    totalQuantity: number
  },
): string {
  const { manufacturerName, orderCount, totalQuantity, totalAmount, date } = data

  const formattedDate = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
  const formattedAmount = totalAmount.toLocaleString('ko-KR')

  // 기본 본문 치환
  const body = template.replace('{제조사명}', manufacturerName).replace('{날짜}', formattedDate)

  // 주문 요약 HTML 추가
  const summaryHtml = `
    <div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 8px;">
      <h3 style="margin: 0 0 10px 0; color: #333;">📦 발주 요약</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 5px 0; color: #666;">발주일</td>
          <td style="padding: 5px 0; text-align: right; font-weight: bold;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #666;">총 주문 건수</td>
          <td style="padding: 5px 0; text-align: right; font-weight: bold;">${orderCount}건</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #666;">총 수량</td>
          <td style="padding: 5px 0; text-align: right; font-weight: bold;">${totalQuantity}개</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #666;">총 금액</td>
          <td style="padding: 5px 0; text-align: right; font-weight: bold;">${formattedAmount}원</td>
        </tr>
      </table>
    </div>
    <p style="margin-top: 20px; font-size: 12px; color: #999;">
      ※ 상세 내역은 첨부된 엑셀 파일을 확인해 주세요.
    </p>
  `

  return `
    <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto;">
      <p style="margin: 0 0 10px 0; line-height: 1.6;">${body}</p>
      ${summaryHtml}
    </div>
  `
}

// Helper function to normalize address for comparison
function normalizeAddress(address: string): string {
  return address.replace(/\s+/g, '').replace(/[,.-]/g, '').toLowerCase()
}

// Helper function to check if fulfillment type should be excluded
async function shouldExcludeFromEmail(fulfillmentType?: string): Promise<boolean> {
  if (!fulfillmentType) return false

  const exclusionSettings = await getExclusionSettings()
  if (!exclusionSettings.enabled) return false

  return exclusionSettings.patterns.some((p) => p.enabled && fulfillmentType.includes(p.pattern))
}

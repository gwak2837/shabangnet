import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db/client'
import { manufacturer } from '@/db/schema/manufacturers'
import { order } from '@/db/schema/orders'
import { auth } from '@/lib/auth'
import { orderExcludedReasonSql, orderIsExcludedSql } from '@/services/order-exclusion'
import { stringifyCsv } from '@/utils/csv'

const periodTypeSchema = z.enum(['month', 'range']).default('month')

const queryParamsSchema = z
  .object({
    manufacturerId: z.coerce.number().int().positive(),
    periodType: periodTypeSchema,
    month: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.periodType === 'month') {
      if (!value.month || !/^\d{4}-\d{2}$/.test(value.month)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'month 형식이 올바르지 않아요. (예: 2025-12)',
          path: ['month'],
        })
      }
      return
    }

    if (value.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(value.startDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'start-date 형식이 올바르지 않아요. (예: 2025-12-01)',
        path: ['startDate'],
      })
    }
    if (value.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(value.endDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'end-date 형식이 올바르지 않아요. (예: 2025-12-31)',
        path: ['endDate'],
      })
    }
  })

const SETTLEMENT_CSV_HEADER = [
  '주문ID',
  '업로드ID',
  '제조사ID',
  '제조사명',
  '사방넷주문번호',
  '쇼핑몰주문번호',
  '부주문번호',
  '사이트',
  '상품코드',
  '쇼핑몰상품번호',
  '상품명',
  '옵션',
  '상품약어',
  '모델번호',
  '수량',
  '결제금액',
  '원가(상품)*수량',
  '택배비',
  '총원가(원가+택배비)',
  '주문인',
  '주문인연락처',
  '주문인핸드폰',
  '받는인',
  '받는인연락처',
  '받는인핸드폰',
  '우편번호',
  '배송지',
  '전언',
  '물류전달사항',
  '택배사',
  '송장번호',
  '주문유형(F)',
  '씨제이날짜',
  '수집일시',
  '상태',
  '발주일시',
  '이메일제외',
  '제외사유',
] as const

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const validation = queryParamsSchema.safeParse({
    manufacturerId: searchParams.get('manufacturer-id') || undefined,
    periodType: searchParams.get('period-type') || 'month',
    month: searchParams.get('month') || undefined,
    startDate: searchParams.get('start-date') || undefined,
    endDate: searchParams.get('end-date') || undefined,
  })

  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
  }

  const { manufacturerId, periodType, month, startDate, endDate } = validation.data
  const { startAt, endAt } = getDateRange({ periodType, month, startDate, endDate })
  const period = formatPeriod({ periodType, month, startDate, endDate })

  const [mfr] = await db.select({ name: manufacturer.name }).from(manufacturer).where(eq(manufacturer.id, manufacturerId))
  if (!mfr) {
    return NextResponse.json({ error: '제조사를 찾을 수 없어요.' }, { status: 400 })
  }

  try {
    const rows = await db
      .select({
        id: order.id,
        uploadId: order.uploadId,
        manufacturerId: order.manufacturerId,
        manufacturerName: order.manufacturerName,
        sabangnetOrderNumber: order.sabangnetOrderNumber,
        mallOrderNumber: order.mallOrderNumber,
        subOrderNumber: order.subOrderNumber,
        shoppingMall: order.shoppingMall,
        productCode: order.productCode,
        mallProductNumber: order.mallProductNumber,
        productName: order.productName,
        optionName: order.optionName,
        productAbbr: order.productAbbr,
        modelNumber: order.modelNumber,
        quantity: order.quantity,
        paymentAmount: order.paymentAmount,
        cost: order.cost,
        shippingCost: order.shippingCost,
        orderName: order.orderName,
        orderPhone: order.orderPhone,
        orderMobile: order.orderMobile,
        recipientName: order.recipientName,
        recipientPhone: order.recipientPhone,
        recipientMobile: order.recipientMobile,
        postalCode: order.postalCode,
        address: order.address,
        memo: order.memo,
        logisticsNote: order.logisticsNote,
        courier: order.courier,
        trackingNumber: order.trackingNumber,
        fulfillmentType: order.fulfillmentType,
        cjDate: order.cjDate,
        collectedAt: order.collectedAt,
        status: order.status,
        createdAt: order.createdAt,
        excludedReason: orderExcludedReasonSql(order.fulfillmentType),
      })
      .from(order)
      .where(
        and(
          eq(order.manufacturerId, manufacturerId),
          eq(order.status, 'completed'),
          gte(order.createdAt, startAt),
          lte(order.createdAt, endAt),
        ),
      )
      .orderBy(desc(order.createdAt), desc(order.id))

    const summary = await getSettlementSummary({ manufacturerId, startAt, endAt })

    const csvRows: string[][] = [
      Array.from(SETTLEMENT_CSV_HEADER),
      ...rows.map((r) => {
        const quantity = r.quantity ?? 1
        const cost = r.cost ?? 0
        const shippingCost = r.shippingCost ?? 0
        const totalCost = cost + shippingCost
        const excludedReason = typeof r.excludedReason === 'string' ? r.excludedReason.trim() : ''
        const excludedFromEmail = excludedReason.length > 0

        return [
          String(r.id),
          r.uploadId != null ? String(r.uploadId) : '',
          r.manufacturerId != null ? String(r.manufacturerId) : '',
          r.manufacturerName ?? '',
          r.sabangnetOrderNumber,
          r.mallOrderNumber ?? '',
          r.subOrderNumber ?? '',
          r.shoppingMall ?? '',
          r.productCode ?? '',
          r.mallProductNumber ?? '',
          r.productName ?? '',
          r.optionName ?? '',
          r.productAbbr ?? '',
          r.modelNumber ?? '',
          String(quantity),
          String(r.paymentAmount ?? 0),
          String(cost),
          String(shippingCost),
          String(totalCost),
          r.orderName ?? '',
          r.orderPhone ?? '',
          r.orderMobile ?? '',
          r.recipientName ?? '',
          r.recipientPhone ?? '',
          r.recipientMobile ?? '',
          r.postalCode ?? '',
          r.address ?? '',
          r.memo ?? '',
          r.logisticsNote ?? '',
          r.courier ?? '',
          r.trackingNumber ?? '',
          r.fulfillmentType ?? '',
          r.cjDate ? toIsoDate(r.cjDate) : '',
          r.collectedAt ? r.collectedAt.toISOString() : '',
          r.status ?? '',
          r.createdAt.toISOString(),
          excludedFromEmail ? 'Y' : '',
          excludedFromEmail ? excludedReason : '',
        ]
      }),
    ]

    if (rows.length > 0) {
      csvRows.push(buildSummaryRow({ manufacturerName: mfr.name, period, summary }))
    }

    const csvText = stringifyCsv(csvRows, { bom: true })
    const date = new Date().toISOString().split('T')[0]
    const safeManufacturerName = mfr.name.replace(/[\\/:*?\"<>|]/g, '_')

    return new NextResponse(csvText, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(`정산_${safeManufacturerName}_${date}.csv`)}"`,
        'Content-Type': 'text/csv; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Failed to export settlement csv:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

function buildSummaryRow(params: {
  manufacturerName: string
  period: string
  summary: {
    excludedOrderCount: number
    totalCost: number
    totalOrders: number
    totalQuantity: number
    totalShippingCost: number
  }
}): string[] {
  const total = params.summary.totalCost + params.summary.totalShippingCost

  return [
    '',
    '',
    '',
    params.manufacturerName,
    '',
    '',
    '',
    '',
    '',
    '',
    `합계 (${params.period})`,
    `총 ${params.summary.totalOrders}건`,
    '',
    '',
    String(params.summary.totalQuantity),
    '',
    String(params.summary.totalCost),
    String(params.summary.totalShippingCost),
    String(total),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    `${params.summary.excludedOrderCount}건`,
    '',
  ]
}

function formatPeriod(filters: { endDate?: string; month?: string; periodType: 'month' | 'range'; startDate?: string }): string {
  if (filters.periodType === 'month' && filters.month) {
    const [year, month] = filters.month.split('-')
    return `${year}년 ${month}월`
  }
  return `${filters.startDate || ''} ~ ${filters.endDate || ''}`
}

function getDateRange(filters: {
  endDate?: string
  month?: string
  periodType: 'month' | 'range'
  startDate?: string
}): { endAt: Date; startAt: Date } {
  if (filters.periodType === 'month' && filters.month) {
    const [year, month] = filters.month.split('-').map(Number)
    const startAt = new Date(year, month - 1, 1)
    const endAt = new Date(year, month, 0, 23, 59, 59, 999) // Last day of month
    return { startAt, endAt }
  }

  const startAt = filters.startDate ? new Date(filters.startDate) : new Date()
  const endAt = filters.endDate ? new Date(filters.endDate) : new Date()
  endAt.setHours(23, 59, 59, 999)

  return { startAt, endAt }
}

async function getSettlementSummary(params: { endAt: Date; manufacturerId: number; startAt: Date }): Promise<{
  excludedOrderCount: number
  totalCost: number
  totalOrders: number
  totalQuantity: number
  totalShippingCost: number
}> {
  const [{ totalOrders, totalQuantity, totalCost, totalShippingCost, excludedOrderCount }] = await db
    .select({
      totalOrders: sql<number>`count(*)::int`,
      totalQuantity: sql<number>`coalesce(sum(coalesce(${order.quantity}, 1)), 0)::int`,
      totalCost: sql<number>`coalesce(sum(coalesce(${order.cost}, 0)), 0)::int`,
      totalShippingCost: sql<number>`coalesce(sum(coalesce(${order.shippingCost}, 0)), 0)::int`,
      excludedOrderCount: sql<number>`coalesce(sum(case when ${orderIsExcludedSql(order.fulfillmentType)} then 1 else 0 end), 0)::int`,
    })
    .from(order)
    .where(
      and(
        eq(order.manufacturerId, params.manufacturerId),
        eq(order.status, 'completed'),
        gte(order.createdAt, params.startAt),
        lte(order.createdAt, params.endAt),
      ),
    )

  return {
    totalOrders: totalOrders ?? 0,
    totalQuantity: totalQuantity ?? 0,
    totalCost: totalCost ?? 0,
    totalShippingCost: totalShippingCost ?? 0,
    excludedOrderCount: excludedOrderCount ?? 0,
  }
}

function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0] ?? ''
}



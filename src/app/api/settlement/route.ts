import { and, desc, eq, gte, lt, lte, or, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { decodeCursor, encodeCursor } from '@/app/api/util/cursor'
import { db } from '@/db/client'
import { manufacturer } from '@/db/schema/manufacturers'
import { order } from '@/db/schema/orders'
import { auth } from '@/lib/auth'
import { orderExcludedReasonSql, orderIsExcludedSql } from '@/services/order-exclusion'
import { createCacheControl } from '@/utils/cache-control'

interface SettlementListItem {
  address: string
  collectedAt: string | null
  cost: number
  createdAt: string
  customerName: string
  excludedFromEmail: boolean
  excludedReason?: string
  fulfillmentType: string | null
  id: number
  mallOrderNumber: string | null
  memo: string | null
  optionName: string
  orderName: string | null
  paymentAmount: number
  postalCode: string | null
  productCode: string | null
  productName: string
  quantity: number
  recipientMobile: string | null
  recipientPhone: string | null
  sabangnetOrderNumber: string
  shippingCost: number
  shoppingMall: string | null
  subOrderNumber: string | null
  totalCost: number
  trackingNumber: string | null
}

interface SettlementListResponse {
  items: SettlementListItem[]
  nextCursor: string | null
  summary?: SettlementSummary
}

interface SettlementSummary {
  excludedOrderCount: number
  manufacturerName: string
  period: string
  totalCost: number
  totalOrders: number
  totalQuantity: number
  totalShippingCost: number
}

const periodTypeSchema = z.enum(['month', 'range']).default('month')

const queryParamsSchema = z
  .object({
    cursor: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).default(50),
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

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const validation = queryParamsSchema.safeParse({
    cursor: searchParams.get('cursor') || undefined,
    limit: searchParams.get('limit') || 50,
    manufacturerId: searchParams.get('manufacturer-id') || undefined,
    periodType: searchParams.get('period-type') || 'month',
    month: searchParams.get('month') || undefined,
    startDate: searchParams.get('start-date') || undefined,
    endDate: searchParams.get('end-date') || undefined,
  })

  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
  }

  try {
    const result = await getSettlementOrders(validation.data)
    return NextResponse.json(result, {
      headers: { 'Cache-Control': createCacheControl({ private: true, maxAge: 0 }) },
    })
  } catch (error) {
    console.error('Failed to fetch settlement:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

function createEmptySummary(filters: {
  endDate?: string
  month?: string
  periodType: 'month' | 'range'
  startDate?: string
}) {
  return {
    totalOrders: 0,
    totalQuantity: 0,
    totalCost: 0,
    totalShippingCost: 0,
    excludedOrderCount: 0,
    manufacturerName: '',
    period: formatPeriod(filters),
  } satisfies SettlementSummary
}

function formatPeriod(filters: {
  endDate?: string
  month?: string
  periodType: 'month' | 'range'
  startDate?: string
}): string {
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

async function getSettlementOrders(params: z.infer<typeof queryParamsSchema>): Promise<SettlementListResponse> {
  const { cursor, limit, manufacturerId, periodType, month, startDate, endDate } = params
  const { startAt, endAt } = getDateRange({ periodType, month, startDate, endDate })

  const [mfr] = await db
    .select({ name: manufacturer.name })
    .from(manufacturer)
    .where(eq(manufacturer.id, manufacturerId))

  if (!mfr) {
    return { items: [], nextCursor: null, summary: createEmptySummary({ periodType, month, startDate, endDate }) }
  }

  const conditions = [
    eq(order.manufacturerId, manufacturerId),
    eq(order.status, 'completed'),
    gte(order.createdAt, startAt),
    lte(order.createdAt, endAt),
  ]

  if (cursor) {
    const decoded = decodeCursor(
      cursor,
      z.object({
        createdAt: z.string().datetime(),
        id: z.number().int().positive(),
      }),
    )
    const cursorCreatedAt = new Date(decoded.createdAt)
    const cursorId = decoded.id
    const cursorCondition = or(
      lt(order.createdAt, cursorCreatedAt),
      and(eq(order.createdAt, cursorCreatedAt), lt(order.id, cursorId)),
    )
    if (cursorCondition) {
      conditions.push(cursorCondition)
    }
  }

  const rows = await db
    .select({
      id: order.id,
      sabangnetOrderNumber: order.sabangnetOrderNumber,
      mallOrderNumber: order.mallOrderNumber,
      subOrderNumber: order.subOrderNumber,
      shoppingMall: order.shoppingMall,
      productCode: order.productCode,
      productName: order.productName,
      optionName: order.optionName,
      quantity: order.quantity,
      paymentAmount: order.paymentAmount,
      cost: order.cost,
      shippingCost: order.shippingCost,
      orderName: order.orderName,
      recipientName: order.recipientName,
      recipientPhone: order.recipientPhone,
      recipientMobile: order.recipientMobile,
      postalCode: order.postalCode,
      address: order.address,
      memo: order.memo,
      trackingNumber: order.trackingNumber,
      fulfillmentType: order.fulfillmentType,
      collectedAt: order.collectedAt,
      excludedReason: orderExcludedReasonSql(order.fulfillmentType),
      createdAt: order.createdAt,
    })
    .from(order)
    .where(and(...conditions))
    .orderBy(desc(order.createdAt), desc(order.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const pageRows = hasMore ? rows.slice(0, -1) : rows
  const lastRow = pageRows[pageRows.length - 1]

  const items: SettlementListItem[] = pageRows.map((o) => {
    const quantity = o.quantity ?? 1
    const cost = o.cost ?? 0
    const shippingCost = o.shippingCost ?? 0
    const excludedReason = typeof o.excludedReason === 'string' ? o.excludedReason.trim() : ''
    const excludedFromEmail = excludedReason.length > 0

    return {
      id: o.id,
      sabangnetOrderNumber: o.sabangnetOrderNumber,
      mallOrderNumber: o.mallOrderNumber ?? null,
      subOrderNumber: o.subOrderNumber ?? null,
      shoppingMall: o.shoppingMall ?? null,
      productCode: o.productCode ?? null,
      productName: o.productName || '',
      optionName: o.optionName || '',
      quantity,
      paymentAmount: o.paymentAmount ?? 0,
      cost,
      shippingCost,
      totalCost: cost + shippingCost,
      orderName: o.orderName ?? null,
      customerName: o.recipientName || '',
      recipientPhone: o.recipientPhone ?? null,
      recipientMobile: o.recipientMobile ?? null,
      postalCode: o.postalCode ?? null,
      address: o.address || '',
      memo: o.memo ?? null,
      trackingNumber: o.trackingNumber ?? null,
      fulfillmentType: o.fulfillmentType ?? null,
      collectedAt: o.collectedAt ? o.collectedAt.toISOString() : null,
      excludedFromEmail,
      excludedReason: excludedFromEmail ? excludedReason : undefined,
      createdAt: o.createdAt.toISOString(),
    }
  })

  const nextCursor =
    hasMore && lastRow ? encodeCursor({ createdAt: lastRow.createdAt.toISOString(), id: lastRow.id }) : null

  if (cursor) {
    return { items, nextCursor }
  }

  const summary = await getSettlementSummary({
    manufacturerId,
    manufacturerName: mfr.name,
    startAt,
    endAt,
    period: formatPeriod({ periodType, month, startDate, endDate }),
  })

  return { items, nextCursor, summary }
}

async function getSettlementSummary(params: {
  endAt: Date
  manufacturerId: number
  manufacturerName: string
  period: string
  startAt: Date
}): Promise<SettlementSummary> {
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
    manufacturerName: params.manufacturerName,
    period: params.period,
  }
}

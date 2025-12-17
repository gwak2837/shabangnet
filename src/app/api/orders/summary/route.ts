import { and, isNotNull, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db/client'
import { order } from '@/db/schema/orders'
import { auth } from '@/lib/auth'
import { orderIsIncludedSql } from '@/services/order-exclusion'
import { createCacheControl } from '@/utils/cache-control'

interface OrderBatchSummaryResponse {
  errorBatches: number
  pendingBatchesCount: number
  sentBatches: number
  totalBatches: number
  totalOrders: number
}

const queryParamsSchema = z.object({
  search: z.string().max(100).optional(),
  manufacturerId: z.coerce.number().positive().optional(),
  status: z.enum(['all', 'pending', 'sent', 'error']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const validation = queryParamsSchema.safeParse({
    search: searchParams.get('search') || undefined,
    manufacturerId: searchParams.get('manufacturer-id') || undefined,
    status: searchParams.get('status') || undefined,
    dateFrom: searchParams.get('date-from') || undefined,
    dateTo: searchParams.get('date-to') || undefined,
  })

  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
  }

  const { search, manufacturerId, status, dateFrom, dateTo } = validation.data

  // /api/orders 와 동일한 검색/기간 조건
  const searchCondition = search
    ? sql`(
        sabangnet_order_number ILIKE ${`%${search}%`} OR
        mall_order_number ILIKE ${`%${search}%`} OR
        product_name ILIKE ${`%${search}%`} OR
        recipient_name ILIKE ${`%${search}%`} OR
        manufacturer_name ILIKE ${`%${search}%`}
      )`
    : undefined

  const dateFromCondition = dateFrom ? sql`created_at >= ${dateFrom}::timestamp` : undefined
  const dateToCondition = dateTo ? sql`created_at <= ${dateTo}::timestamp + interval '1 day'` : undefined

  try {
    const rows = await db
      .select({
        manufacturerId: order.manufacturerId,
        totalOrders: sql<number>`count(${order.id})`.mapWith(Number),
        hasError: sql<boolean>`bool_or(${order.status} = 'error')`.mapWith(Boolean),
        allCompleted: sql<boolean>`bool_and(${order.status} = 'completed')`.mapWith(Boolean),
      })
      .from(order)
      .where(
        and(
          isNotNull(order.manufacturerId),
          orderIsIncludedSql(order.fulfillmentType),
          manufacturerId ? sql`${order.manufacturerId} = ${manufacturerId}` : undefined,
          searchCondition,
          dateFromCondition,
          dateToCondition,
        ),
      )
      .groupBy(order.manufacturerId)

    let totalBatches = 0
    let pendingBatchesCount = 0
    let sentBatches = 0
    let errorBatches = 0
    let totalOrders = 0

    for (const row of rows) {
      const batchStatus: 'error' | 'pending' | 'sent' = row.hasError ? 'error' : row.allCompleted ? 'sent' : 'pending'

      if (status && status !== 'all' && batchStatus !== status) {
        continue
      }

      totalBatches += 1
      totalOrders += row.totalOrders

      if (batchStatus === 'pending') pendingBatchesCount += 1
      if (batchStatus === 'sent') sentBatches += 1
      if (batchStatus === 'error') errorBatches += 1
    }

    const response: OrderBatchSummaryResponse = {
      totalBatches,
      pendingBatchesCount,
      sentBatches,
      errorBatches,
      totalOrders,
    }

    return NextResponse.json(response, {
      headers: { 'Cache-Control': createCacheControl({ private: true, maxAge: 60, swr: 300 }) },
    })
  } catch (error) {
    console.error('Failed to fetch order summary:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

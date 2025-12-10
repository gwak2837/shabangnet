import { and, gt, isNotNull, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db/client'
import { manufacturer } from '@/db/schema/manufacturers'
import { auth } from '@/lib/auth'
import { createCacheControl } from '@/utils/cache-control'

// ============================================
// Types
// ============================================

interface Order {
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

interface OrderBatch {
  email: string
  lastSentAt?: string
  manufacturerId: number
  manufacturerName: string
  orders: Order[]
  status: 'error' | 'pending' | 'ready' | 'sent'
  totalAmount: number
  totalOrders: number
}

interface OrderBatchesResponse {
  items: OrderBatch[]
  nextCursor: number | null
}

// ============================================
// Query Params Schema
// ============================================

const queryParamsSchema = z.object({
  cursor: z.coerce.number().positive().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
  manufacturerId: z.coerce.number().positive().optional(),
  status: z.enum(['all', 'pending', 'sent', 'error']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

// ============================================
// GET /api/orders
// ============================================

interface GetOrderBatchesParams {
  cursor?: number
  dateFrom?: string
  dateTo?: string
  limit: number
  manufacturerId?: number
  search?: string
  status?: 'all' | 'error' | 'pending' | 'sent'
}

// ============================================
// Data Fetching Logic
// ============================================

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)

  const validation = queryParamsSchema.safeParse({
    cursor: searchParams.get('cursor') || undefined,
    limit: searchParams.get('limit') || 20,
    search: searchParams.get('search') || undefined,
    manufacturerId: searchParams.get('manufacturer-id') || undefined,
    status: searchParams.get('status') || undefined,
    dateFrom: searchParams.get('date-from') || undefined,
    dateTo: searchParams.get('date-to') || undefined,
  })

  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
  }

  const { cursor, limit, search, manufacturerId, status, dateFrom, dateTo } = validation.data

  try {
    const result = await getOrderBatches({ cursor, limit, search, manufacturerId, status, dateFrom, dateTo })

    return NextResponse.json(result, {
      headers: { 'Cache-Control': createCacheControl({ private: true, maxAge: 60, swr: 300 }) },
    })
  } catch (error) {
    console.error('Failed to fetch order batches:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

async function getOrderBatches(params: GetOrderBatchesParams): Promise<OrderBatchesResponse> {
  const { cursor, limit, search, manufacturerId, status, dateFrom, dateTo } = params

  // 1. 제조사 목록 조회 (cursor-based pagination)
  const manufacturerConditions = []

  if (cursor) {
    manufacturerConditions.push(gt(manufacturer.id, cursor))
  }

  // 특정 제조사 필터
  if (manufacturerId) {
    manufacturerConditions.push(sql`${manufacturer.id} = ${manufacturerId}`)
  }

  const manufacturers = await db
    .select({
      id: manufacturer.id,
      name: manufacturer.name,
      email: manufacturer.email,
    })
    .from(manufacturer)
    .where(manufacturerConditions.length > 0 ? and(...manufacturerConditions) : undefined)
    .orderBy(manufacturer.id)
    .limit(manufacturerId ? 1 : limit + 1)

  const hasNextPage = manufacturers.length > limit
  const manufacturersToProcess = hasNextPage ? manufacturers.slice(0, -1) : manufacturers
  const nextCursor = hasNextPage ? manufacturersToProcess[manufacturersToProcess.length - 1].id : null

  if (manufacturersToProcess.length === 0) {
    return { items: [], nextCursor: null }
  }

  // 2. 주문 조회 (search + date 조건 포함)
  const manufacturerIds = manufacturersToProcess.map((m) => m.id)

  // FIXME: 필요하나?
  const searchCondition = search
    ? sql`(
        sabangnet_order_number ILIKE ${`%${search}%`} OR
        mall_order_number ILIKE ${`%${search}%`} OR
        product_name ILIKE ${`%${search}%`} OR
        recipient_name ILIKE ${`%${search}%`} OR
        manufacturer_name ILIKE ${`%${search}%`}
      )`
    : undefined

  // FIXME: 왜 raw SQL?
  const dateFromCondition = dateFrom ? sql`created_at >= ${dateFrom}::timestamp` : undefined
  const dateToCondition = dateTo ? sql`created_at <= ${dateTo}::timestamp + interval '1 day'` : undefined

  // FIXME: 왜 이건 findMany? 모범 사례?
  const allOrders = await db.query.order.findMany({
    where: (o, { and: andOp, inArray }) =>
      andOp(
        isNotNull(o.manufacturerId),
        inArray(o.manufacturerId, manufacturerIds),
        searchCondition,
        dateFromCondition,
        dateToCondition,
      ),
  })

  // 3. 제조사별로 그룹핑
  const batchesMap = new Map<number, OrderBatch>()

  for (const m of manufacturersToProcess) {
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
    if (!o.manufacturerId) {
      continue
    }

    // excludedReason이 설정된 주문은 발송 대상에서 제외
    if (o.excludedReason) {
      continue
    }

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
        orderName: o.orderName || undefined,
      })
    }
  }

  // 5. 통계 및 상태 계산 + 상태 필터링
  const items: OrderBatch[] = []

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

    if (status && status !== 'all' && batch.status !== status) {
      continue
    }

    items.push(batch)
  }

  return { items, nextCursor }
}

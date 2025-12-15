import { and, desc, eq, gt, inArray, isNotNull, isNull, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db/client'
import { manufacturer } from '@/db/schema/manufacturers'
import { orderEmailLog } from '@/db/schema/orders'
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
  ccEmail?: string
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

  // 검색/기간 조건
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

  // 제조사 0건은 숨기되, 페이지가 빈 배열로 내려오지 않도록 내부에서 더 스캔
  const items: OrderBatch[] = []
  let scanCursor = manufacturerId ? undefined : cursor
  let nextCursor: number | null = null

  const manufacturerPageSize = manufacturerId ? 1 : Math.min(200, Math.max(50, limit * 10))

  while (items.length < limit) {
    const manufacturerConditions = []

    if (manufacturerId) {
      manufacturerConditions.push(eq(manufacturer.id, manufacturerId))
    } else if (scanCursor) {
      manufacturerConditions.push(gt(manufacturer.id, scanCursor))
    }

    const manufacturers = await db
      .select({
        id: manufacturer.id,
        name: manufacturer.name,
        email: manufacturer.email,
        ccEmail: manufacturer.ccEmail,
      })
      .from(manufacturer)
      .where(manufacturerConditions.length > 0 ? and(...manufacturerConditions) : undefined)
      .orderBy(manufacturer.id)
      .limit(manufacturerId ? 1 : manufacturerPageSize + 1)

    if (manufacturers.length === 0) {
      nextCursor = null
      break
    }

    const hasMoreManufacturers = !manufacturerId && manufacturers.length > manufacturerPageSize
    const manufacturersToProcess = hasMoreManufacturers ? manufacturers.slice(0, -1) : manufacturers

    if (manufacturersToProcess.length === 0) {
      nextCursor = null
      break
    }

    const manufacturerIds = manufacturersToProcess.map((m) => m.id)
    const scanEndId = manufacturersToProcess[manufacturersToProcess.length - 1]!.id

    // 주문 조회 (발송 대상만: excludedReason is null)
    const allOrders = await db.query.order.findMany({
      where: (o, { and: andOp, inArray: inArrayOp }) =>
        andOp(
          isNotNull(o.manufacturerId),
          inArrayOp(o.manufacturerId, manufacturerIds),
          isNull(o.excludedReason),
          searchCondition,
          dateFromCondition,
          dateToCondition,
        ),
    })

    // 제조사별 마지막 발송 시간(성공 로그 기준)
    const lastSentRows = await db
      .select({
        manufacturerId: orderEmailLog.manufacturerId,
        sentAt: orderEmailLog.sentAt,
      })
      .from(orderEmailLog)
      .where(
        and(
          isNotNull(orderEmailLog.manufacturerId),
          inArray(orderEmailLog.manufacturerId, manufacturerIds),
          eq(orderEmailLog.status, 'success'),
          isNotNull(orderEmailLog.sentAt),
        ),
      )
      .orderBy(desc(orderEmailLog.sentAt))

    const lastSentAtMap = new Map<number, string>()
    for (const row of lastSentRows) {
      const mfrId = row.manufacturerId
      const sentAt = row.sentAt
      if (!mfrId || !sentAt) continue
      if (!lastSentAtMap.has(mfrId)) {
        lastSentAtMap.set(mfrId, sentAt.toISOString())
      }
    }

    // 제조사별로 그룹핑 (순서 유지: 제조사 id 오름차순)
    const batchesMap = new Map<number, OrderBatch>()
    for (const m of manufacturersToProcess) {
      batchesMap.set(m.id, {
        manufacturerId: m.id,
        manufacturerName: m.name,
        email: m.email ?? '',
        ccEmail: m.ccEmail || undefined,
        orders: [],
        status: 'pending',
        totalAmount: 0,
        totalOrders: 0,
        lastSentAt: lastSentAtMap.get(m.id),
      })
    }

    for (const o of allOrders) {
      if (!o.manufacturerId) continue
      const batch = batchesMap.get(o.manufacturerId)
      if (!batch) continue

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

    // 이번 chunk에서 조건에 맞는 배치만 items에 추가
    for (const m of manufacturersToProcess) {
      const batch = batchesMap.get(m.id)
      if (!batch) continue

      batch.totalOrders = batch.orders.length
      if (batch.totalOrders === 0) {
        continue
      }

      batch.totalAmount = batch.orders.reduce((sum, o) => sum + o.price * o.quantity, 0)

      if (batch.orders.some((o) => o.status === 'error')) {
        batch.status = 'error'
      } else if (batch.orders.every((o) => o.status === 'completed')) {
        batch.status = 'sent'
      } else {
        batch.status = 'pending'
      }

      if (status && status !== 'all' && batch.status !== status) {
        continue
      }

      items.push(batch)
      nextCursor = m.id

      if (items.length >= limit) {
        break
      }
    }

    // 제조사 단일 필터인 경우 추가 스캔 불필요
    if (manufacturerId) {
      nextCursor = null
      break
    }

    // 아직 충분히 못 채웠으면 다음 제조사 chunk로 계속 스캔
    if (items.length < limit) {
      if (hasMoreManufacturers) {
        scanCursor = scanEndId
        nextCursor = scanEndId
        continue
      }
      nextCursor = null
      break
    }

    // limit 채웠으면, 다음 페이지가 존재할 수 있으니 cursor 유지
    if (items.length >= limit) {
      // 이미 nextCursor는 마지막으로 처리한 제조사 id로 설정됨
      break
    }
  }

  return { items, nextCursor }
}

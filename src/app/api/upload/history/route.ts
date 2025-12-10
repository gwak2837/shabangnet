import { and, asc, count, desc, eq, gt, gte, inArray, lt, lte, or } from 'drizzle-orm'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db/client'
import { order, upload } from '@/db/schema/orders'
import { shoppingMallTemplate } from '@/db/schema/settings'
import { auth } from '@/lib/auth'
import { createCacheControl } from '@/utils/cache-control'

interface UploadHistoryItem {
  currentOrderCount: number // 현재 연관된 주문 수
  errorOrders: number
  fileName: string
  fileSize: number
  fileType: 'sabangnet' | 'shopping_mall'
  id: number
  processedOrders: number
  shoppingMallId: number | null
  shoppingMallName: string | null
  status: string
  totalOrders: number
  uploadedAt: string
}

interface UploadHistoryResponse {
  hasMore: boolean
  items: UploadHistoryItem[]
  nextCursor: string | null
}

const queryParamsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  fileType: z.enum(['sabangnet', 'shopping_mall']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['uploadedAt', 'fileName', 'totalOrders', 'processedOrders', 'errorOrders']).default('uploadedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

type QueryParams = z.infer<typeof queryParamsSchema>

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)

  const validation = queryParamsSchema.safeParse({
    cursor: searchParams.get('cursor') || undefined,
    limit: searchParams.get('limit') || 20,
    fileType: searchParams.get('file-type') || undefined,
    startDate: searchParams.get('start-date') || undefined,
    endDate: searchParams.get('end-date') || undefined,
    sortBy: searchParams.get('sort-by') || 'uploadedAt',
    sortOrder: searchParams.get('sort-order') || 'desc',
  })

  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
  }

  try {
    const result = await getUploadHistory(validation.data)

    return NextResponse.json(result, {
      headers: { 'Cache-Control': createCacheControl({ private: true, maxAge: 0 }) },
    })
  } catch (error) {
    console.error('Failed to fetch upload history:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

async function getUploadHistory(params: QueryParams): Promise<UploadHistoryResponse> {
  const { cursor, limit, fileType, startDate, endDate, sortBy, sortOrder } = params

  const conditions = []

  if (fileType) {
    conditions.push(eq(upload.fileType, fileType))
  }

  if (startDate) {
    conditions.push(gte(upload.uploadedAt, new Date(startDate)))
  }

  if (endDate) {
    const endOfDay = new Date(endDate)
    endOfDay.setHours(23, 59, 59, 999)
    conditions.push(lte(upload.uploadedAt, endOfDay))
  }

  if (cursor) {
    const { uploadedAt: cursorDate, id: cursorId } = JSON.parse(cursor) as { id: number; uploadedAt: string }
    const cursorTimestamp = new Date(cursorDate)

    if (sortOrder === 'desc') {
      conditions.push(
        or(
          lt(upload.uploadedAt, cursorTimestamp),
          and(eq(upload.uploadedAt, cursorTimestamp), lt(upload.id, cursorId)),
        ),
      )
    } else {
      conditions.push(
        or(
          gt(upload.uploadedAt, cursorTimestamp),
          and(eq(upload.uploadedAt, cursorTimestamp), gt(upload.id, cursorId)),
        ),
      )
    }
  }

  const sortColumn = {
    uploadedAt: upload.uploadedAt,
    fileName: upload.fileName,
    totalOrders: upload.totalOrders,
    processedOrders: upload.processedOrders,
    errorOrders: upload.errorOrders,
  }[sortBy]

  const orderByFn = sortOrder === 'desc' ? desc : asc
  const secondaryOrderByFn = sortOrder === 'desc' ? desc : asc

  const uploads = await db
    .select({
      id: upload.id,
      fileName: upload.fileName,
      fileSize: upload.fileSize,
      fileType: upload.fileType,
      shoppingMallId: upload.shoppingMallId,
      shoppingMallName: shoppingMallTemplate.displayName,
      totalOrders: upload.totalOrders,
      processedOrders: upload.processedOrders,
      errorOrders: upload.errorOrders,
      status: upload.status,
      uploadedAt: upload.uploadedAt,
    })
    .from(upload)
    .leftJoin(shoppingMallTemplate, eq(upload.shoppingMallId, shoppingMallTemplate.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(orderByFn(sortColumn), secondaryOrderByFn(upload.id))
    .limit(limit + 1)

  const hasMore = uploads.length > limit
  const items = hasMore ? uploads.slice(0, -1) : uploads
  const uploadIds = items.map((u) => u.id)
  const orderCountMap = new Map<number, number>()

  if (uploadIds.length > 0) {
    const orderCounts = await db
      .select({
        uploadId: order.uploadId,
        count: count(),
      })
      .from(order)
      .where(inArray(order.uploadId, uploadIds))
      .groupBy(order.uploadId)

    for (const oc of orderCounts) {
      if (oc.uploadId !== null) {
        orderCountMap.set(oc.uploadId, oc.count)
      }
    }
  }

  // Build next cursor
  const lastItem = items[items.length - 1]
  const nextCursor =
    hasMore && lastItem ? JSON.stringify({ uploadedAt: lastItem.uploadedAt.toISOString(), id: lastItem.id }) : null

  return {
    items: items.map((u) => ({
      id: u.id,
      fileName: u.fileName,
      fileSize: u.fileSize ?? 0,
      fileType: (u.fileType ?? 'sabangnet') as 'sabangnet' | 'shopping_mall',
      shoppingMallId: u.shoppingMallId,
      shoppingMallName: u.shoppingMallName,
      totalOrders: u.totalOrders ?? 0,
      processedOrders: u.processedOrders ?? 0,
      errorOrders: u.errorOrders ?? 0,
      status: u.status ?? 'completed',
      uploadedAt: u.uploadedAt.toISOString(),
      currentOrderCount: orderCountMap.get(u.id) ?? 0,
    })),
    nextCursor,
    hasMore,
  }
}

import { and, asc, count, desc, eq, gt, gte, inArray, lt, lte, or, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { decodeCursor, encodeCursor } from '@/app/api/_utils/cursor'
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

type UploadHistoryRow = {
  errorOrders: number | null
  fileName: string
  fileSize: number | null
  fileType: 'sabangnet' | 'shopping_mall' | null
  id: number
  processedOrders: number | null
  shoppingMallId: number | null
  shoppingMallName: string | null
  status: string | null
  totalOrders: number | null
  uploadedAt: Date
}

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

function getNextUploadHistoryCursor(sortBy: QueryParams['sortBy'], row: UploadHistoryRow): string {
  switch (sortBy) {
    case 'errorOrders':
      return encodeCursor({ sortValue: row.errorOrders ?? 0, id: row.id })
    case 'fileName':
      return encodeCursor({ sortValue: row.fileName ?? '', id: row.id })
    case 'processedOrders':
      return encodeCursor({ sortValue: row.processedOrders ?? 0, id: row.id })
    case 'totalOrders':
      return encodeCursor({ sortValue: row.totalOrders ?? 0, id: row.id })
    case 'uploadedAt': {
      return encodeCursor({ sortValue: row.uploadedAt.toISOString(), id: row.id })
    }
  }
}

async function getUploadHistory(params: QueryParams): Promise<UploadHistoryResponse> {
  const { cursor, limit, fileType, startDate, endDate, sortBy, sortOrder } = params

  const conditions = []
  const sortExpr = getUploadHistorySortExpr(sortBy)

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
    const baseSchema = z.object({ id: z.number().int().positive() })

    switch (sortBy) {
      case 'errorOrders': {
        const parsed = decodeCursor(cursor, baseSchema.extend({ sortValue: z.number() }))
        const cursorId = parsed.id
        const sortValue = parsed.sortValue
        const expr = sql<number>`coalesce(${upload.errorOrders}, 0)`

        if (sortOrder === 'desc') {
          conditions.push(or(lt(expr, sortValue), and(eq(expr, sortValue), lt(upload.id, cursorId))))
        } else {
          conditions.push(or(gt(expr, sortValue), and(eq(expr, sortValue), gt(upload.id, cursorId))))
        }
        break
      }
      case 'fileName': {
        const parsed = decodeCursor(
          cursor,
          baseSchema.extend({
            sortValue: z.string(),
          }),
        )
        const cursorId = parsed.id
        const sortValue = parsed.sortValue

        if (sortOrder === 'desc') {
          conditions.push(
            or(lt(upload.fileName, sortValue), and(eq(upload.fileName, sortValue), lt(upload.id, cursorId))),
          )
        } else {
          conditions.push(
            or(gt(upload.fileName, sortValue), and(eq(upload.fileName, sortValue), gt(upload.id, cursorId))),
          )
        }
        break
      }
      case 'processedOrders': {
        const parsed = decodeCursor(
          cursor,
          baseSchema.extend({
            sortValue: z.number(),
          }),
        )
        const cursorId = parsed.id
        const sortValue = parsed.sortValue
        const expr = sql<number>`coalesce(${upload.processedOrders}, 0)`

        if (sortOrder === 'desc') {
          conditions.push(or(lt(expr, sortValue), and(eq(expr, sortValue), lt(upload.id, cursorId))))
        } else {
          conditions.push(or(gt(expr, sortValue), and(eq(expr, sortValue), gt(upload.id, cursorId))))
        }
        break
      }
      case 'totalOrders': {
        const parsed = decodeCursor(
          cursor,
          baseSchema.extend({
            sortValue: z.number(),
          }),
        )
        const cursorId = parsed.id
        const sortValue = parsed.sortValue
        const expr = sql<number>`coalesce(${upload.totalOrders}, 0)`

        if (sortOrder === 'desc') {
          conditions.push(or(lt(expr, sortValue), and(eq(expr, sortValue), lt(upload.id, cursorId))))
        } else {
          conditions.push(or(gt(expr, sortValue), and(eq(expr, sortValue), gt(upload.id, cursorId))))
        }
        break
      }
      case 'uploadedAt': {
        const parsed = decodeCursor(
          cursor,
          baseSchema.extend({
            sortValue: z.string().datetime(),
          }),
        )
        const cursorId = parsed.id
        const sortValue = new Date(parsed.sortValue)

        if (sortOrder === 'desc') {
          conditions.push(
            or(lt(upload.uploadedAt, sortValue), and(eq(upload.uploadedAt, sortValue), lt(upload.id, cursorId))),
          )
        } else {
          conditions.push(
            or(gt(upload.uploadedAt, sortValue), and(eq(upload.uploadedAt, sortValue), gt(upload.id, cursorId))),
          )
        }
        break
      }
    }
  }

  const orderByFn = sortOrder === 'desc' ? desc : asc

  const uploads: UploadHistoryRow[] = await db
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
    .orderBy(orderByFn(sortExpr), orderByFn(upload.id))
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
  const nextCursor = hasMore && lastItem ? getNextUploadHistoryCursor(sortBy, lastItem) : null

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

function getUploadHistorySortExpr(sortBy: QueryParams['sortBy']) {
  switch (sortBy) {
    case 'errorOrders':
      return sql<number>`coalesce(${upload.errorOrders}, 0)`
    case 'fileName':
      return upload.fileName
    case 'processedOrders':
      return sql<number>`coalesce(${upload.processedOrders}, 0)`
    case 'totalOrders':
      return sql<number>`coalesce(${upload.totalOrders}, 0)`
    case 'uploadedAt':
      return upload.uploadedAt
  }
}

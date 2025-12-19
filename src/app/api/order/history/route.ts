import { and, desc, eq, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { decodeCursor, encodeCursor } from '@/app/api/util/cursor'
import { db } from '@/db/client'
import { orderEmailLog } from '@/db/schema/orders'
import { auth } from '@/lib/auth'
import { createCacheControl } from '@/utils/cache-control'

interface LogListItem {
  duplicateReason?: string
  email: string
  errorMessage?: string
  fileName: string
  hasAttachment: boolean
  id: number
  manufacturerId: number | null
  manufacturerName: string
  orderCount: number
  orders: unknown[]
  recipientAddresses: string[]
  sentAt: string
  sentBy: string
  status: 'failed' | 'pending' | 'success'
  subject: string
  totalAmount: number
}

interface LogListResponse {
  items: LogListItem[]
  nextCursor: string | null
  summary: LogListSummary
}

interface LogListSummary {
  failedLogs: number
  successLogs: number
  totalLogs: number
}

const queryParamsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  manufacturerId: z.coerce.number().positive().optional(),
  status: z.enum(['all', 'failed', 'pending', 'success']).default('all'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
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
    status: searchParams.get('status') || 'all',
    startDate: searchParams.get('start-date') || undefined,
    endDate: searchParams.get('end-date') || undefined,
  })

  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
  }

  try {
    const result = await getLogs(validation.data)
    return NextResponse.json(result, {
      headers: { 'Cache-Control': createCacheControl({ private: true, maxAge: 0 }) },
    })
  } catch (error) {
    console.error('Failed to fetch order history:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

async function getLogs(params: z.infer<typeof queryParamsSchema>): Promise<LogListResponse> {
  const { cursor, limit, manufacturerId, status, startDate, endDate } = params

  const conditions = []

  if (manufacturerId) {
    conditions.push(eq(orderEmailLog.manufacturerId, manufacturerId))
  }

  if (status !== 'all') {
    conditions.push(eq(orderEmailLog.status, status))
  }

  if (startDate) {
    conditions.push(sql`coalesce(${orderEmailLog.sentAt}, ${orderEmailLog.createdAt}) >= ${new Date(startDate)}`)
  }

  if (endDate) {
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)
    conditions.push(sql`coalesce(${orderEmailLog.sentAt}, ${orderEmailLog.createdAt}) <= ${end}`)
  }

  const sortExpr = sql<Date>`coalesce(${orderEmailLog.sentAt}, ${orderEmailLog.createdAt})`

  if (cursor) {
    const decoded = decodeCursor(
      cursor,
      z.object({
        id: z.number().int().positive(),
        sortAt: z.string().datetime(),
      }),
    )
    const cursorSortAt = new Date(decoded.sortAt)
    const cursorId = decoded.id

    conditions.push(
      sql`(
        ${sortExpr} < ${cursorSortAt} OR
        (${sortExpr} = ${cursorSortAt} AND ${orderEmailLog.id} < ${cursorId})
      )`,
    )
  }

  const rows = await db
    .select({
      id: orderEmailLog.id,
      manufacturerId: orderEmailLog.manufacturerId,
      manufacturerName: orderEmailLog.manufacturerName,
      email: orderEmailLog.email,
      subject: orderEmailLog.subject,
      fileName: orderEmailLog.fileName,
      attachmentFileSize: orderEmailLog.attachmentFileSize,
      orderCount: orderEmailLog.orderCount,
      totalAmount: orderEmailLog.totalAmount,
      status: orderEmailLog.status,
      errorMessage: orderEmailLog.errorMessage,
      recipientAddresses: orderEmailLog.recipientAddresses,
      duplicateReason: orderEmailLog.duplicateReason,
      sentAt: orderEmailLog.sentAt,
      sentBy: orderEmailLog.sentBy,
      createdAt: orderEmailLog.createdAt,
    })
    .from(orderEmailLog)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(sortExpr), desc(orderEmailLog.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const pageItems = hasMore ? rows.slice(0, -1) : rows
  const lastItem = pageItems[pageItems.length - 1]

  const items: LogListItem[] = pageItems.map((log) => {
    const sortAt = (log.sentAt ?? log.createdAt).toISOString()

    return {
      id: log.id,
      manufacturerId: log.manufacturerId ?? null,
      manufacturerName: log.manufacturerName,
      email: log.email,
      subject: log.subject,
      fileName: log.fileName || '',
      hasAttachment: (log.attachmentFileSize ?? 0) > 0,
      orderCount: log.orderCount || 0,
      totalAmount: log.totalAmount ?? 0,
      status: log.status as LogListItem['status'],
      errorMessage: log.errorMessage || undefined,
      recipientAddresses: (log.recipientAddresses as string[]) || [],
      duplicateReason: log.duplicateReason || undefined,
      sentAt: sortAt,
      sentBy: log.sentBy || 'Unknown',
      orders: [],
    }
  })

  const summary = await getLogSummary()

  return {
    items,
    nextCursor:
      hasMore && lastItem
        ? encodeCursor({ sortAt: (lastItem.sentAt ?? lastItem.createdAt).toISOString(), id: lastItem.id })
        : null,
    summary,
  }
}

async function getLogSummary(): Promise<LogListSummary> {
  const [{ totalLogs }] = await db.select({ totalLogs: sql<number>`count(*)::int` }).from(orderEmailLog)
  const [{ successLogs }] = await db
    .select({ successLogs: sql<number>`count(*)::int` })
    .from(orderEmailLog)
    .where(eq(orderEmailLog.status, 'success'))
  const [{ failedLogs }] = await db
    .select({ failedLogs: sql<number>`count(*)::int` })
    .from(orderEmailLog)
    .where(eq(orderEmailLog.status, 'failed'))

  return { totalLogs, successLogs, failedLogs }
}

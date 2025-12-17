import { and, desc, eq, lt, or, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { decodeCursor, encodeCursor } from '@/app/api/_utils/cursor'
import { db } from '@/db/client'
import { manufacturer } from '@/db/schema/manufacturers'
import { auth } from '@/lib/auth'
import { createCacheControl } from '@/utils/cache-control'

interface ManufacturerListItem {
  ccEmail?: string
  contactName: string
  email: string | null
  id: number
  lastOrderDate: string
  name: string
  orderCount: number
  phone: string
}

interface ManufacturerListResponse {
  items: ManufacturerListItem[]
  nextCursor: string | null
  summary: ManufacturerListSummary
}

interface ManufacturerListSummary {
  totalManufacturers: number
  totalOrders: number
}

const queryParamsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  search: z.string().max(100).optional(),
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
    search: searchParams.get('search') || undefined,
  })

  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
  }

  try {
    const result = await getManufacturers(validation.data)
    return NextResponse.json(result, {
      headers: { 'Cache-Control': createCacheControl({ private: true, maxAge: 0 }) },
    })
  } catch (error) {
    console.error('Failed to fetch manufacturers:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

async function getManufacturers(params: z.infer<typeof queryParamsSchema>): Promise<ManufacturerListResponse> {
  const { cursor, limit, search } = params

  const conditions = []

  if (search) {
    conditions.push(
      sql`(
        ${manufacturer.name} ILIKE ${`%${search}%`} OR
        coalesce(${manufacturer.contactName}, '') ILIKE ${`%${search}%`} OR
        coalesce(${manufacturer.email}, '') ILIKE ${`%${search}%`}
      )`,
    )
  }

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

    conditions.push(
      or(
        lt(manufacturer.createdAt, cursorCreatedAt),
        and(eq(manufacturer.createdAt, cursorCreatedAt), lt(manufacturer.id, cursorId)),
      ),
    )
  }

  const rows = await db
    .select({
      id: manufacturer.id,
      name: manufacturer.name,
      contactName: manufacturer.contactName,
      email: manufacturer.email,
      ccEmail: manufacturer.ccEmail,
      phone: manufacturer.phone,
      orderCount: manufacturer.orderCount,
      lastOrderDate: manufacturer.lastOrderDate,
      createdAt: manufacturer.createdAt,
    })
    .from(manufacturer)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(manufacturer.createdAt), desc(manufacturer.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const pageItems = hasMore ? rows.slice(0, -1) : rows
  const lastItem = pageItems[pageItems.length - 1]

  const items: ManufacturerListItem[] = pageItems.map((m) => ({
    id: m.id,
    name: m.name,
    contactName: m.contactName || '',
    email: m.email ?? null,
    ccEmail: m.ccEmail || undefined,
    phone: m.phone || '',
    orderCount: m.orderCount || 0,
    lastOrderDate: m.lastOrderDate ? m.lastOrderDate.toISOString().split('T')[0] : '',
  }))

  const summary = await getManufacturerSummary()

  return {
    items,
    nextCursor:
      hasMore && lastItem ? encodeCursor({ createdAt: lastItem.createdAt.toISOString(), id: lastItem.id }) : null,
    summary,
  }
}

async function getManufacturerSummary(): Promise<ManufacturerListSummary> {
  const [{ totalManufacturers, totalOrders }] = await db
    .select({
      totalManufacturers: sql<number>`count(*)::int`,
      totalOrders: sql<number>`coalesce(sum(coalesce(${manufacturer.orderCount}, 0)), 0)::int`,
    })
    .from(manufacturer)

  return { totalManufacturers, totalOrders }
}



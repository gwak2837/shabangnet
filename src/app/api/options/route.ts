import { and, desc, eq, isNotNull, isNull, lt, or, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { decodeCursor, encodeCursor } from '@/app/api/util/cursor'
import { db } from '@/db/client'
import { manufacturer, optionMapping } from '@/db/schema/manufacturers'
import { auth } from '@/lib/auth'
import { createCacheControl } from '@/utils/cache-control'

interface OptionMappingListItem {
  createdAt: string
  id: number
  manufacturerId: number | null
  manufacturerName: string | null
  optionName: string
  productCode: string
  updatedAt: string
}

interface OptionMappingListResponse {
  items: OptionMappingListItem[]
  nextCursor: string | null
  summary: OptionMappingListSummary
}

interface OptionMappingListSummary {
  totalMappings: number
  uniqueManufacturers: number
  uniqueProductCodes: number
  unmappedMappings: number
}

const queryParamsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  search: z.string().max(100).optional(),
  manufacturerId: z.coerce.number().positive().optional(),
  unmapped: z.preprocess((value) => {
    if (value === '1' || value === 'true') return true
    if (value === '0' || value === 'false') return false
    return undefined
  }, z.boolean().optional()),
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
    manufacturerId: searchParams.get('manufacturer-id') || undefined,
    unmapped: searchParams.get('unmapped') || undefined,
  })

  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
  }

  try {
    const result = await getOptionMappings(validation.data)
    return NextResponse.json(result, {
      headers: { 'Cache-Control': createCacheControl({ private: true, maxAge: 0 }) },
    })
  } catch (error) {
    console.error('Failed to fetch option mappings:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

async function getOptionMappings(params: z.infer<typeof queryParamsSchema>): Promise<OptionMappingListResponse> {
  const { cursor, limit, search, manufacturerId, unmapped } = params

  const conditions = []

  // 기본은 "연결된 항목만" 보여줘요. 미연결 후보는 `unmapped=true`로 조회해요.
  if (unmapped === true) {
    conditions.push(isNull(optionMapping.manufacturerId))
  } else {
    conditions.push(isNotNull(optionMapping.manufacturerId))
  }

  if (search) {
    conditions.push(
      sql`(
        ${optionMapping.productCode} ILIKE ${`%${search}%`} OR
        ${optionMapping.optionName} ILIKE ${`%${search}%`}
      )`,
    )
  }

  if (manufacturerId) {
    conditions.push(eq(optionMapping.manufacturerId, manufacturerId))
  }

  if (cursor) {
    const decoded = decodeCursor(
      cursor,
      z.object({
        createdAt: z.iso.datetime(),
        id: z.number().int().positive(),
      }),
    )
    const cursorCreatedAt = new Date(decoded.createdAt)
    const cursorId = decoded.id

    conditions.push(
      or(
        lt(optionMapping.createdAt, cursorCreatedAt),
        and(eq(optionMapping.createdAt, cursorCreatedAt), lt(optionMapping.id, cursorId)),
      ),
    )
  }

  const rows = await db
    .select({
      id: optionMapping.id,
      productCode: optionMapping.productCode,
      optionName: optionMapping.optionName,
      manufacturerId: optionMapping.manufacturerId,
      manufacturerName: manufacturer.name,
      createdAt: optionMapping.createdAt,
      updatedAt: optionMapping.updatedAt,
    })
    .from(optionMapping)
    .leftJoin(manufacturer, eq(optionMapping.manufacturerId, manufacturer.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(optionMapping.createdAt), desc(optionMapping.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const pageItems = hasMore ? rows.slice(0, -1) : rows
  const lastItem = pageItems[pageItems.length - 1]

  const items: OptionMappingListItem[] = pageItems.map((m) => ({
    id: m.id,
    productCode: m.productCode,
    optionName: m.optionName,
    manufacturerId: m.manufacturerId,
    manufacturerName: m.manufacturerName ?? null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }))

  const summary = await getOptionMappingSummary()

  return {
    items,
    nextCursor:
      hasMore && lastItem ? encodeCursor({ createdAt: lastItem.createdAt.toISOString(), id: lastItem.id }) : null,
    summary,
  }
}

async function getOptionMappingSummary(): Promise<OptionMappingListSummary> {
  const [{ totalMappings, unmappedMappings, uniqueProductCodes, uniqueManufacturers }] = await db
    .select({
      totalMappings: sql<number>`count(*) filter (where ${optionMapping.manufacturerId} is not null)::int`,
      unmappedMappings: sql<number>`count(*) filter (where ${optionMapping.manufacturerId} is null)::int`,
      uniqueProductCodes: sql<number>`count(distinct ${optionMapping.productCode}) filter (where ${optionMapping.manufacturerId} is not null)::int`,
      uniqueManufacturers: sql<number>`count(distinct ${optionMapping.manufacturerId})::int`,
    })
    .from(optionMapping)

  return { totalMappings, uniqueManufacturers, uniqueProductCodes, unmappedMappings }
}

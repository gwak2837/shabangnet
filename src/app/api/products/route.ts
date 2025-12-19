import { and, desc, eq, isNull, lt, or, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { decodeCursor, encodeCursor } from '@/app/api/util/cursor'
import { db } from '@/db/client'
import { manufacturer, product } from '@/db/schema/manufacturers'
import { auth } from '@/lib/auth'
import { createCacheControl } from '@/utils/cache-control'

interface ProductListItem {
  cost: number
  createdAt: string
  id: number
  manufacturerId: number | null
  manufacturerName: string | null
  optionName: string
  price: number
  productCode: string
  productName: string
  shippingFee: number
  updatedAt: string
}

interface ProductListResponse {
  items: ProductListItem[]
  nextCursor: string | null
  summary: ProductListSummary
}

interface ProductListSummary {
  mappedProducts: number
  priceErrorProducts: number
  totalProducts: number
  unmappedProducts: number
}

const booleanString = z
  .union([z.literal('true'), z.literal('false')])
  .default('false')
  .transform((v) => v === 'true')

const queryParamsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  search: z.string().max(100).optional(),
  unmapped: booleanString,
  priceError: booleanString,
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
    unmapped: searchParams.get('unmapped') || 'false',
    priceError: searchParams.get('price-error') || 'false',
  })

  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
  }

  try {
    const result = await getProducts(validation.data)
    return NextResponse.json(result, {
      headers: { 'Cache-Control': createCacheControl({ private: true, maxAge: 0 }) },
    })
  } catch (error) {
    console.error('Failed to fetch products:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

async function getProducts(params: z.infer<typeof queryParamsSchema>): Promise<ProductListResponse> {
  const { cursor, limit, search, unmapped, priceError } = params

  const conditions = []

  if (search) {
    conditions.push(
      sql`(
        ${product.productCode} ILIKE ${`%${search}%`} OR
        ${product.productName} ILIKE ${`%${search}%`} OR
        coalesce(${product.optionName}, '') ILIKE ${`%${search}%`}
      )`,
    )
  }

  if (unmapped) {
    conditions.push(isNull(product.manufacturerId))
  }

  if (priceError) {
    conditions.push(
      sql`coalesce(${product.cost}, 0) > 0 AND coalesce(${product.price}, 0) > 0 AND coalesce(${product.cost}, 0) > coalesce(${product.price}, 0)`,
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
      or(lt(product.createdAt, cursorCreatedAt), and(eq(product.createdAt, cursorCreatedAt), lt(product.id, cursorId))),
    )
  }

  const rows = await db
    .select({
      id: product.id,
      productCode: product.productCode,
      productName: product.productName,
      optionName: product.optionName,
      manufacturerId: product.manufacturerId,
      manufacturerName: manufacturer.name,
      price: product.price,
      cost: product.cost,
      shippingFee: product.shippingFee,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    })
    .from(product)
    .leftJoin(manufacturer, eq(product.manufacturerId, manufacturer.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(product.createdAt), desc(product.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const pageItems = hasMore ? rows.slice(0, -1) : rows
  const lastItem = pageItems[pageItems.length - 1]

  const items: ProductListItem[] = pageItems.map((p) => ({
    id: p.id,
    productCode: p.productCode,
    productName: p.productName,
    optionName: p.optionName || '',
    manufacturerId: p.manufacturerId ?? null,
    manufacturerName: p.manufacturerName ?? null,
    price: p.price ?? 0,
    cost: p.cost ?? 0,
    shippingFee: p.shippingFee ?? 0,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }))

  const summary = await getProductSummary()

  return {
    items,
    nextCursor:
      hasMore && lastItem ? encodeCursor({ createdAt: lastItem.createdAt.toISOString(), id: lastItem.id }) : null,
    summary,
  }
}

async function getProductSummary(): Promise<ProductListSummary> {
  const [{ totalProducts }] = await db.select({ totalProducts: sql<number>`count(*)::int` }).from(product)
  const [{ unmappedProducts }] = await db
    .select({ unmappedProducts: sql<number>`count(*)::int` })
    .from(product)
    .where(isNull(product.manufacturerId))
  const [{ priceErrorProducts }] = await db
    .select({ priceErrorProducts: sql<number>`count(*)::int` })
    .from(product)
    .where(
      sql`coalesce(${product.cost}, 0) > 0 AND coalesce(${product.price}, 0) > 0 AND coalesce(${product.cost}, 0) > coalesce(${product.price}, 0)`,
    )

  return {
    totalProducts,
    unmappedProducts,
    mappedProducts: Math.max(0, totalProducts - unmappedProducts),
    priceErrorProducts,
  }
}

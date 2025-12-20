import { sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { db } from '@/db/client'
import { product } from '@/db/schema/manufacturers'
import { auth } from '@/lib/auth'
import { createCacheControl } from '@/utils/cache-control'

interface ProductSummaryResponse {
  mappedProducts: number
  priceErrorProducts: number
  totalProducts: number
  unmappedProducts: number
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const priceErrorCondition = sql`coalesce(${product.cost}, 0) > 0 AND coalesce(${product.price}, 0) > 0 AND coalesce(${product.cost}, 0) > coalesce(${product.price}, 0)`

    const [{ totalProducts, unmappedProducts, priceErrorProducts }] = await db
      .select({
        totalProducts: sql<number>`count(*)::int`,
        unmappedProducts: sql<number>`count(*) filter (where ${product.manufacturerId} is null)::int`,
        priceErrorProducts: sql<number>`count(*) filter (where ${priceErrorCondition})::int`,
      })
      .from(product)

    const response: ProductSummaryResponse = {
      totalProducts,
      unmappedProducts,
      mappedProducts: Math.max(0, totalProducts - unmappedProducts),
      priceErrorProducts,
    }

    return NextResponse.json(response, {
      headers: { 'Cache-Control': createCacheControl({ private: true, maxAge: 0 }) },
    })
  } catch (error) {
    console.error('Failed to fetch product summary:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}



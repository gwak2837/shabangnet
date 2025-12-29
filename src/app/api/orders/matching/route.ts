import { and, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { db } from '@/db/client'
import { manufacturer, product } from '@/db/schema/manufacturers'
import { order } from '@/db/schema/orders'
import { auth } from '@/lib/auth'
import { orderIsIncludedSql } from '@/services/order-exclusion'

interface MatchingResponse {
  missingEmailManufacturers: MissingEmailManufacturer[]
  unmappedProducts: { orderCount: number; productCode: string; productName: string }[]
  unmatchedProductCodes: UnmatchedProductCodeGroup[]
}

interface MissingEmailManufacturer {
  id: number
  name: string
  orderCount: number
}

interface UnmatchedProductCodeGroup {
  orderCount: number
  productCode: string
  productNameSample: string
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 이메일 미설정 제조사(주문 존재)
  const missingEmailRows = await db
    .select({
      id: manufacturer.id,
      name: manufacturer.name,
      orderCount: sql<number>`count(${order.id})`.mapWith(Number),
    })
    .from(order)
    .innerJoin(manufacturer, eq(order.manufacturerId, manufacturer.id))
    .where(
      and(
        orderIsIncludedSql(order.fulfillmentType),
        isNotNull(order.manufacturerId),
        sql`coalesce(array_length(${manufacturer.emails}, 1), 0) = 0`,
      ),
    )
    .groupBy(manufacturer.id, manufacturer.name)
    .orderBy(desc(sql<number>`count(${order.id})`.mapWith(Number)))

  // 제조사 미연결 주문(상품코드 기준 그룹)
  const unmatchedRows = await db
    .select({
      productCode: order.productCode,
      orderCount: sql<number>`count(${order.id})`.mapWith(Number),
      productNameSample: sql<string>`max(coalesce(${order.productName}, ''))`,
    })
    .from(order)
    .where(
      and(
        orderIsIncludedSql(order.fulfillmentType),
        isNull(order.manufacturerId),
        isNotNull(order.productCode),
        sql`trim(${order.productCode}) <> ''`,
      ),
    )
    .groupBy(order.productCode)
    .orderBy(desc(sql<number>`count(${order.id})`.mapWith(Number)))

  // 상품 미연결(product.manufacturerId = null) + 해당 상품코드 주문 수
  const unmappedProductRows = await db
    .select({
      productCode: product.productCode,
      productName: product.productName,
      orderCount: sql<number>`count(${order.id})`.mapWith(Number),
    })
    .from(product)
    .leftJoin(
      order,
      and(
        orderIsIncludedSql(order.fulfillmentType),
        isNotNull(order.productCode),
        sql`lower(trim(${order.productCode})) = lower(trim(${product.productCode}))`,
      ),
    )
    .where(isNull(product.manufacturerId))
    .groupBy(product.productCode, product.productName)
    .orderBy(desc(sql<number>`count(${order.id})`.mapWith(Number)))

  const response: MatchingResponse = {
    missingEmailManufacturers: missingEmailRows.map((r) => ({ id: r.id, name: r.name, orderCount: r.orderCount })),
    unmatchedProductCodes: unmatchedRows
      .map((r) => ({
        productCode: r.productCode ?? '',
        orderCount: r.orderCount,
        productNameSample: r.productNameSample ?? '',
      }))
      .filter((r) => r.productCode.trim().length > 0),
    unmappedProducts: unmappedProductRows.map((r) => ({
      productCode: r.productCode,
      productName: r.productName,
      orderCount: r.orderCount,
    })),
  }

  return NextResponse.json(response, { headers: { 'Cache-Control': 'private, no-store' } })
}

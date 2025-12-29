import { and, eq, isNull, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createSimpleXlsxBuffer } from '@/app/api/util/excel'
import { PRODUCT_EXCEL_HEADER } from '@/app/product/product-excel.types'
import { db } from '@/db/client'
import { manufacturer, product } from '@/db/schema/manufacturers'
import { auth } from '@/lib/auth'

const booleanString = z
  .union([z.literal('true'), z.literal('false')])
  .default('false')
  .transform((v) => v === 'true')

const queryParamsSchema = z.object({
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
    search: searchParams.get('search') || undefined,
    unmapped: searchParams.get('unmapped') || 'false',
    priceError: searchParams.get('price-error') || 'false',
  })

  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
  }

  const { search, unmapped, priceError } = validation.data

  try {
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

    const rows = await db
      .select({
        productCode: product.productCode,
        productName: product.productName,
        optionName: product.optionName,
        manufacturerName: manufacturer.name,
        price: product.price,
        cost: product.cost,
        shippingFee: product.shippingFee,
      })
      .from(product)
      .leftJoin(manufacturer, eq(product.manufacturerId, manufacturer.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(product.productCode)

    const excelRows = rows.map((r) => [
      r.productCode,
      r.productName,
      r.optionName ?? '',
      r.manufacturerName ?? '',
      r.price ?? '',
      r.cost ?? '',
      r.shippingFee ?? '',
    ])

    const body = await createSimpleXlsxBuffer({
      sheetName: '상품',
      header: Array.from(PRODUCT_EXCEL_HEADER),
      rows: excelRows,
      columnWidths: [20, 40, 30, 20, 12, 12, 12],
    })

    const date = new Date().toISOString().split('T')[0]?.replaceAll('-', '') ?? ''

    return new NextResponse(body, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(`상품_${date}.xlsx`)}"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    })
  } catch (error) {
    console.error('Failed to export products excel:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}



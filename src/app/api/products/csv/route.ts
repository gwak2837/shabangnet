import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { PRODUCT_CSV_HEADER } from '@/components/product/product-csv.types'
import { db } from '@/db/client'
import { manufacturer, product } from '@/db/schema/manufacturers'
import { auth } from '@/lib/auth'
import { stringifyCsv } from '@/utils/csv'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
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
      .orderBy(product.productCode)

    const csvRows = [
      PRODUCT_CSV_HEADER,
      ...rows.map((r) => [
        r.productCode,
        r.productName,
        r.optionName ?? '',
        r.manufacturerName ?? '',
        r.price && r.price > 0 ? String(r.price) : '',
        r.cost && r.cost > 0 ? String(r.cost) : '',
        r.shippingFee && r.shippingFee > 0 ? String(r.shippingFee) : '',
      ]),
    ] as const

    const csvText = stringifyCsv(csvRows, { bom: true })
    const date = new Date().toISOString().split('T')[0]

    return new NextResponse(csvText, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(`상품_${date}.csv`)}"`,
        'Content-Type': 'text/csv; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Failed to export products csv:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}



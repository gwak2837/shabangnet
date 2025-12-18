import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { OPTION_MAPPING_CSV_HEADER } from '@/components/option-mapping/option-mapping-csv.types'
import { db } from '@/db/client'
import { manufacturer, optionMapping } from '@/db/schema/manufacturers'
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
        manufacturerName: manufacturer.name,
        optionName: optionMapping.optionName,
        productCode: optionMapping.productCode,
      })
      .from(optionMapping)
      .leftJoin(manufacturer, eq(optionMapping.manufacturerId, manufacturer.id))
      .orderBy(optionMapping.productCode, optionMapping.optionName)

    const csvRows = [
      OPTION_MAPPING_CSV_HEADER,
      ...rows.map((r) => [r.productCode, r.optionName, r.manufacturerName ?? '']),
    ] as const

    const csvText = stringifyCsv(csvRows, { bom: true })
    const date = new Date().toISOString().split('T')[0]

    return new NextResponse(csvText, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(`옵션연결_${date}.csv`)}"`,
        'Content-Type': 'text/csv; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Failed to export option mappings csv:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}



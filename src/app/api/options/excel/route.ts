import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createSimpleXlsxBuffer } from '@/app/api/util/excel'
import { OPTION_MAPPING_EXCEL_HEADER } from '@/components/option-mapping/option-mapping-excel.types'
import { db } from '@/db/client'
import { manufacturer, optionMapping } from '@/db/schema/manufacturers'
import { auth } from '@/lib/auth'

const queryParamsSchema = z.object({
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
    search: searchParams.get('search') || undefined,
    manufacturerId: searchParams.get('manufacturer-id') || undefined,
    unmapped: searchParams.get('unmapped') || undefined,
  })

  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
  }

  const { search, manufacturerId, unmapped } = validation.data

  try {
    const conditions = []

    // 기본은 "연결된 항목만" 내려줘요. 미연결 후보는 `unmapped=true`로 내려줘요.
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

    const rows = await db
      .select({
        manufacturerName: manufacturer.name,
        optionName: optionMapping.optionName,
        productCode: optionMapping.productCode,
      })
      .from(optionMapping)
      .leftJoin(manufacturer, eq(optionMapping.manufacturerId, manufacturer.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(optionMapping.productCode, optionMapping.optionName)

    const excelRows = rows.map((r) => [r.productCode, r.optionName, r.manufacturerName ?? ''])

    const body = await createSimpleXlsxBuffer({
      sheetName: '옵션연결',
      header: Array.from(OPTION_MAPPING_EXCEL_HEADER),
      rows: excelRows,
      columnWidths: [20, 40, 20],
    })

    const date = new Date().toISOString().split('T')[0]?.replaceAll('-', '') ?? ''

    return new NextResponse(body, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(`옵션연결_${date}.xlsx`)}"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    })
  } catch (error) {
    console.error('Failed to export option mappings excel:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}



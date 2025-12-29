import { and, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createSimpleXlsxBuffer } from '@/app/api/util/excel'
import { MANUFACTURER_EXCEL_HEADER } from '@/components/manufacturer/manufacturer-excel.types'
import { db } from '@/db/client'
import { manufacturer } from '@/db/schema/manufacturers'
import { auth } from '@/lib/auth'

const queryParamsSchema = z.object({
  search: z.string().max(100).optional(),
})

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const validation = queryParamsSchema.safeParse({
    search: searchParams.get('search') || undefined,
  })

  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
  }

  const { search } = validation.data

  try {
    const conditions = []

    if (search) {
      conditions.push(
        sql`(
          ${manufacturer.name} ILIKE ${`%${search}%`} OR
          coalesce(${manufacturer.contactName}, '') ILIKE ${`%${search}%`} OR
          coalesce(array_to_string(${manufacturer.emails}, ','), '') ILIKE ${`%${search}%`}
        )`,
      )
    }

    const rows = await db
      .select({
        name: manufacturer.name,
        contactName: manufacturer.contactName,
        emails: manufacturer.emails,
        phone: manufacturer.phone,
      })
      .from(manufacturer)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(manufacturer.name)

    const excelRows = rows.map((r) => [
      r.name,
      r.contactName ?? '',
      Array.isArray(r.emails) ? r.emails.join(', ') : '',
      r.phone ?? '',
    ])

    const body = await createSimpleXlsxBuffer({
      sheetName: '제조사',
      header: Array.from(MANUFACTURER_EXCEL_HEADER),
      rows: excelRows,
      columnWidths: [20, 16, 40, 20],
    })

    const date = new Date().toISOString().split('T')[0]?.replaceAll('-', '') ?? ''

    return new NextResponse(body, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(`제조사_${date}.xlsx`)}"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    })
  } catch (error) {
    console.error('Failed to export manufacturers excel:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}



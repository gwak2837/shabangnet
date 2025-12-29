import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { MANUFACTURER_CSV_HEADER } from '@/components/manufacturer/manufacturer-csv.types'
import { db } from '@/db/client'
import { manufacturer } from '@/db/schema/manufacturers'
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
        name: manufacturer.name,
        contactName: manufacturer.contactName,
        emails: manufacturer.emails,
        phone: manufacturer.phone,
      })
      .from(manufacturer)
      .orderBy(manufacturer.name)

    const csvRows = [
      MANUFACTURER_CSV_HEADER,
      ...rows.map((r) => [r.name, r.contactName ?? '', r.emails.join(', '), r.phone ?? '']),
    ] as const

    const csvText = stringifyCsv(csvRows, { bom: true })
    const date = new Date().toISOString().split('T')[0]

    return new NextResponse(csvText, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(`제조사_${date}.csv`)}"`,
        'Content-Type': 'text/csv; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Failed to export manufacturers csv:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

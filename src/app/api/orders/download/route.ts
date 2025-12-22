import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/lib/auth'
import { generateOrderExcelForDownload } from '@/services/orders'

const querySchema = z.object({
  manufacturerId: z.coerce.number().positive(),
  search: z.string().max(100).optional(),
  status: z.enum(['all', 'pending', 'sent', 'error']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.coerce.number().min(1).max(2000).optional(),
})

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const validation = querySchema.safeParse({
    manufacturerId: searchParams.get('manufacturer-id'),
    search: searchParams.get('search') || undefined,
    status: searchParams.get('status') || undefined,
    dateFrom: searchParams.get('date-from') || undefined,
    dateTo: searchParams.get('date-to') || undefined,
    limit: searchParams.get('limit') || undefined,
  })

  if (!validation.success) {
    return NextResponse.json({ error: validation.error.message }, { status: 400 })
  }

  const { manufacturerId, search, status, dateFrom, dateTo, limit } = validation.data
  const excelResult = await generateOrderExcelForDownload({ manufacturerId, search, status, dateFrom, dateTo, limit })

  if ('error' in excelResult) {
    return NextResponse.json({ error: excelResult.error }, { status: 400 })
  }

  const fileName = excelResult.fileName

  const body = new Uint8Array(excelResult.buffer)

  return new NextResponse(body, {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  })
}

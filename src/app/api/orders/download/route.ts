import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/lib/auth'
import { generateOrderExcel } from '@/services/orders'

const querySchema = z.object({
  manufacturerId: z.coerce.number().positive(),
  orderIds: z
    .string()
    .min(1)
    .transform((value) => [
      ...new Set(
        value
          .split(',')
          .map((v) => Number(v.trim()))
          .filter((n) => Number.isFinite(n) && n > 0),
      ),
    ])
    .refine((ids) => ids.length > 0, { message: 'order-ids가 필요해요' }),
})

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const validation = querySchema.safeParse({
    manufacturerId: searchParams.get('manufacturer-id'),
    orderIds: searchParams.get('order-ids'),
  })

  if (!validation.success) {
    return NextResponse.json({ error: validation.error.message }, { status: 400 })
  }

  const { manufacturerId, orderIds } = validation.data
  const excelResult = await generateOrderExcel({ manufacturerId, orderIds })

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

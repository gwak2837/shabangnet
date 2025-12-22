import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db/client'
import { orderEmailLog } from '@/db/schema/orders'
import { auth } from '@/lib/auth'

const paramsSchema = z.object({
  id: z.coerce.number().positive(),
})

export async function GET(_request: NextRequest, context: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = await context.params
  const validation = paramsSchema.safeParse({ id: params.id })
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.message }, { status: 400 })
  }

  const logId = validation.data.id

  const [row] = await db
    .select({
      fileName: orderEmailLog.fileName,
      attachmentFile: orderEmailLog.attachmentFile,
    })
    .from(orderEmailLog)
    .where(eq(orderEmailLog.id, logId))

  if (!row?.attachmentFile) {
    return NextResponse.json({ error: '다운로드할 파일이 없어요' }, { status: 404 })
  }

  const fileName = row.fileName?.trim() ? row.fileName : `발주서_${logId}.xlsx`
  const body = new Uint8Array(row.attachmentFile)

  return new NextResponse(body, {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  })
}

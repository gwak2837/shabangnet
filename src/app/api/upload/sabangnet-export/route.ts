import { inArray } from 'drizzle-orm'
import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { SABANGNET_COLUMNS } from '@/common/constants'
import { db } from '@/db/client'
import { order } from '@/db/schema/orders'

const bodySchema = z.object({
  orderNumbers: z.array(z.string()).min(1, '주문번호가 필요합니다'),
  mallName: z.string().optional(),
})

/**
 * 사방넷 양식 엑셀 파일 다운로드
 * POST /api/upload/sabangnet-export
 * Body: { orderNumbers: string[], mallName?: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = bodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || '유효하지 않은 요청입니다' },
        { status: 400 },
      )
    }

    const { orderNumbers, mallName } = parsed.data

    const orders = await db.select().from(order).where(inArray(order.sabangnetOrderNumber, orderNumbers))

    if (orders.length === 0) {
      return NextResponse.json({ error: '주문 데이터가 없습니다' }, { status: 404 })
    }

    // 엑셀 생성
    const workbook = new ExcelJS.Workbook()
    workbook.creator = '(주)다온에프앤씨'
    workbook.created = new Date()

    const worksheet = workbook.addWorksheet('주문데이터')
    worksheet.columns = SABANGNET_COLUMNS.map((col) => ({ header: col.label }))
    worksheet.getRow(1).font = { bold: true }

    for (const orderItem of orders) {
      const orderRecord = orderItem as unknown as Record<string, unknown>
      const rowData = SABANGNET_COLUMNS.map((col) => orderRecord[col.key] ?? '')
      worksheet.addRow(rowData)
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const fileName = encodeURIComponent(`사방넷양식_${mallName || '업로드'}_${date}.xlsx`)

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('Sabangnet export error:', error)
    return NextResponse.json({ error: '다운로드 중 오류가 발생했습니다' }, { status: 500 })
  }
}

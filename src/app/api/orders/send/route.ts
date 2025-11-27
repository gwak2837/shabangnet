import { sendEmail } from '@/lib/email'
import { generateOrderSheet, generateOrderFileName, type OrderData } from '@/lib/excel'
import { NextResponse } from 'next/server'

// 발주 발송 요청 타입
interface SendOrderRequest {
  manufacturerId: string
  manufacturerName: string
  email: string
  ccEmail?: string
  orders: OrderData[]
  // 중복 발송 시 사유
  duplicateReason?: string
}

// 응답 타입
interface SendOrderResponse {
  success: boolean
  messageId?: string
  fileName?: string
  orderCount?: number
  totalAmount?: number
  error?: string
}

export async function POST(request: Request): Promise<NextResponse<SendOrderResponse>> {
  try {
    const body: SendOrderRequest = await request.json()

    // 필수 필드 검증
    if (!body.manufacturerId) {
      return NextResponse.json({ success: false, error: '제조사 ID는 필수입니다.' }, { status: 400 })
    }

    if (!body.manufacturerName) {
      return NextResponse.json({ success: false, error: '제조사명은 필수입니다.' }, { status: 400 })
    }

    if (!body.email) {
      return NextResponse.json({ success: false, error: '이메일 주소는 필수입니다.' }, { status: 400 })
    }

    if (!body.orders || body.orders.length === 0) {
      return NextResponse.json({ success: false, error: '발송할 주문이 없습니다.' }, { status: 400 })
    }

    // 날짜 정보
    const now = new Date()
    const dateStr = formatDate(now)

    // 엑셀 파일 생성
    const excelBuffer = await generateOrderSheet({
      manufacturerName: body.manufacturerName,
      orders: body.orders,
      date: now,
    })

    const fileName = generateOrderFileName(body.manufacturerName, now)

    // 이메일 제목 및 본문
    const subject = `[다온에프앤씨 발주서]_${body.manufacturerName}_${dateStr}`
    const htmlBody = `
      <div style="font-family: 'Malgun Gothic', sans-serif; line-height: 1.6;">
        <p>안녕하세요.</p>
        <p>(주)다온에프앤씨 발주 첨부파일 드립니다.</p>
        <br/>
        <p><strong>발주 정보</strong></p>
        <ul>
          <li>제조사: ${body.manufacturerName}</li>
          <li>주문 건수: ${body.orders.length}건</li>
          <li>발주일: ${formatDateKorean(now)}</li>
        </ul>
        <br/>
        <p>감사합니다.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;"/>
        <p style="color: #666; font-size: 12px;">(주)다온에프앤씨</p>
      </div>
    `

    // 이메일 발송
    const result = await sendEmail({
      to: body.email,
      cc: body.ccEmail,
      subject,
      html: htmlBody,
      attachments: [
        {
          filename: fileName,
          content: excelBuffer,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ],
    })

    if (result.success) {
      // 발송 성공
      const totalAmount = body.orders.reduce((sum, o) => sum + o.price * o.quantity, 0)

      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        fileName,
        orderCount: body.orders.length,
        totalAmount,
      })
    } else {
      // 발송 실패
      return NextResponse.json({ success: false, error: result.error || '이메일 발송에 실패했습니다.' }, { status: 500 })
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}

// 날짜 포맷 (YYYYMMDD)
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

// 한국어 날짜 포맷
function formatDateKorean(date: Date): string {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}


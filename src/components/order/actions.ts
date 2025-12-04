'use server'

import { sendEmail } from '@/lib/email/send'
import { generateOrderFileName, generateOrderSheet, type OrderData } from '@/lib/excel'

// ============================================================================
// Types
// ============================================================================

interface ActionResult {
  error?: string
  success: boolean
}

interface SendOrderInput {
  ccEmail?: string
  duplicateReason?: string
  email: string
  manufacturerId: string
  manufacturerName: string
  orders: OrderData[]
}

interface SendOrderResult extends ActionResult {
  fileName?: string
  messageId?: string
  orderCount?: number
  totalAmount?: number
}

// ============================================================================
// Orders Actions
// ============================================================================

/**
 * 발주서를 이메일로 발송합니다.
 */
export async function sendOrder(input: SendOrderInput): Promise<SendOrderResult> {
  try {
    // 필수 필드 검증
    if (!input.manufacturerId) {
      return { success: false, error: '제조사 ID는 필수입니다.' }
    }

    if (!input.manufacturerName) {
      return { success: false, error: '제조사명은 필수입니다.' }
    }

    if (!input.email) {
      return { success: false, error: '이메일 주소는 필수입니다.' }
    }

    if (!input.orders || input.orders.length === 0) {
      return { success: false, error: '발송할 주문이 없습니다.' }
    }

    // 날짜 정보
    const now = new Date()
    const dateStr = formatDate(now)

    // 엑셀 파일 생성
    const excelBuffer = await generateOrderSheet({
      manufacturerName: input.manufacturerName,
      orders: input.orders,
      date: now,
    })

    const fileName = generateOrderFileName(input.manufacturerName, now)

    // 이메일 제목 및 본문
    const subject = `[다온에프앤씨 발주서]_${input.manufacturerName}_${dateStr}`
    const htmlBody = `
      <div style="font-family: 'Malgun Gothic', sans-serif; line-height: 1.6;">
        <p>안녕하세요.</p>
        <p>(주)다온에프앤씨 발주 첨부파일 드립니다.</p>
        <br/>
        <p><strong>발주 정보</strong></p>
        <ul>
          <li>제조사: ${input.manufacturerName}</li>
          <li>주문 건수: ${input.orders.length}건</li>
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
      to: input.email,
      cc: input.ccEmail,
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
      const totalAmount = input.orders.reduce((sum, o) => sum + o.price * o.quantity, 0)

      return {
        success: true,
        messageId: result.messageId,
        fileName,
        orderCount: input.orders.length,
        totalAmount,
      }
    } else {
      // 발송 실패
      return { success: false, error: result.error || '이메일 발송에 실패했습니다.' }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return { success: false, error: errorMessage }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

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

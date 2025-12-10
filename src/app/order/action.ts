'use server'

import { headers } from 'next/headers'

import { auth } from '@/lib/auth'
import { getSMTPAccount, sendEmail } from '@/lib/email/send'
import { renderOrderEmailTemplate } from '@/lib/email/templates'
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

export async function sendOrder(input: SendOrderInput): Promise<SendOrderResult> {
  try {
    // 현재 로그인 사용자 세션에서 이메일 가져오기
    const session = await auth.api.getSession({ headers: await headers() })
    const userEmail = session?.user?.email

    if (!userEmail) {
      return { success: false, error: '로그인이 필요해요' }
    }

    const smtpAccount = await getSMTPAccount(userEmail)

    if (!smtpAccount) {
      return { success: false, error: 'SMTP 계정이 설정되지 않았습니다. 설정 > 이메일에서 설정해주세요.' }
    }

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

    const now = new Date()

    const excelBuffer = await generateOrderSheet({
      manufacturerName: input.manufacturerName,
      orders: input.orders,
      date: now,
    })

    const fileName = generateOrderFileName(input.manufacturerName, now)
    const fromName = smtpAccount.fromName || '(주)다온에프앤씨'

    const { subject, body } = await renderOrderEmailTemplate({
      manufacturerName: input.manufacturerName,
      senderName: fromName,
      orderDate: formatDateKorean(now),
      totalItems: input.orders.length,
    })

    // 이메일 발송
    const result = await sendEmail({
      to: input.email,
      cc: input.ccEmail,
      subject,
      html: body,
      fromEmail: smtpAccount.email,
      fromName,
      attachments: [
        {
          filename: fileName,
          content: excelBuffer,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ],
    })

    if (result?.messageId) {
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
      return { success: false, error: '이메일 발송에 실패했습니다.' }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return { success: false, error: errorMessage }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

// 한국어 날짜 포맷
function formatDateKorean(date: Date): string {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

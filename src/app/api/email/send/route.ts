import { NextResponse } from 'next/server'

import { sendEmail, type SendEmailOptions } from '@/lib/email'

// 요청 본문 타입
interface SendEmailRequest {
  cc?: string | string[]
  html?: string
  subject: string
  text?: string
  to: string | string[]
}

export async function POST(request: Request) {
  try {
    const body: SendEmailRequest = await request.json()

    // 필수 필드 검증
    if (!body.to) {
      return NextResponse.json({ success: false, error: '수신자(to)는 필수입니다.' }, { status: 400 })
    }

    if (!body.subject) {
      return NextResponse.json({ success: false, error: '제목(subject)은 필수입니다.' }, { status: 400 })
    }

    if (!body.text && !body.html) {
      return NextResponse.json({ success: false, error: '본문(text 또는 html)은 필수입니다.' }, { status: 400 })
    }

    // 이메일 발송
    const options: SendEmailOptions = {
      to: body.to,
      cc: body.cc,
      subject: body.subject,
      text: body.text,
      html: body.html,
    }

    const result = await sendEmail(options)

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: '이메일이 성공적으로 발송되었습니다.',
      })
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}

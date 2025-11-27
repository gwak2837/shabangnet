import { testSMTPConnection } from '@/lib/email'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const result = await testSMTPConnection()

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'SMTP 서버에 성공적으로 연결되었습니다.',
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'SMTP 연결에 실패했습니다.',
        },
        { status: 500 },
      )
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}

// GET 요청도 지원 (간단한 테스트용)
export async function GET() {
  return POST()
}

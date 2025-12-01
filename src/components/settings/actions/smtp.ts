'use server'

import { testSMTPConnection } from '@/lib/email'

// ============================================================================
// Types
// ============================================================================

interface ActionResult {
  error?: string
  message?: string
  success: boolean
}

// ============================================================================
// SMTP Actions
// ============================================================================

/**
 * SMTP 연결을 테스트합니다.
 */
export async function testSMTPConnectionAction(): Promise<ActionResult> {
  try {
    const result = await testSMTPConnection()

    if (result.success) {
      return {
        success: true,
        message: 'SMTP 서버에 성공적으로 연결되었습니다.',
      }
    } else {
      return {
        success: false,
        error: result.error || 'SMTP 연결에 실패했습니다.',
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return { success: false, error: errorMessage }
  }
}


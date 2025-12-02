'use server'

import type { EmailLogEntry, EmailLogFilter, EmailLogStatus } from '@/lib/email/logging'

import { cleanupOldEmailLogs, getEmailLogs } from '@/lib/email/logging'

// ============================================================================
// Types
// ============================================================================

export interface EmailLogDisplayEntry {
  cc: string[] | null
  createdAt: string
  errorMessage: string | null
  id: string
  messageId: string | null
  metadata: Record<string, unknown> | null
  recipient: string
  sentAt: string | null
  status: EmailLogStatus
  subject: string
}

interface ActionResult {
  error?: string
  message?: string
  success: boolean
}

interface GetEmailLogsResult {
  error?: string
  logs: EmailLogDisplayEntry[]
  success: boolean
  total: number
}

// ============================================================================
// Email Log Actions
// ============================================================================

/**
 * 오래된 이메일 로그를 정리합니다.
 */
export async function cleanupEmailLogsAction(olderThanDays: number = 90): Promise<ActionResult> {
  try {
    const deletedCount = await cleanupOldEmailLogs(olderThanDays)

    return {
      success: true,
      message: `${deletedCount}개의 오래된 로그가 삭제되었습니다.`,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '로그 정리 중 오류가 발생했습니다.'
    return { success: false, error: errorMessage }
  }
}

/**
 * 이메일 발송 로그 목록을 조회합니다.
 */
export async function getEmailLogsAction(filter: EmailLogFilter = {}): Promise<GetEmailLogsResult> {
  try {
    const result = await getEmailLogs(filter)

    return {
      success: true,
      logs: result.logs.map((log) => ({
        id: log.id,
        recipient: log.recipient,
        cc: log.cc,
        subject: log.subject,
        status: log.status,
        errorMessage: log.errorMessage,
        messageId: log.messageId,
        metadata: log.metadata,
        sentAt: log.sentAt?.toISOString() || null,
        createdAt: log.createdAt.toISOString(),
      })),
      total: result.total,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '로그를 불러오는 중 오류가 발생했습니다.'
    return { success: false, logs: [], total: 0, error: errorMessage }
  }
}

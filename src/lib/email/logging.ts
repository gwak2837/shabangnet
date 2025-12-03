import { desc, eq, sql } from 'drizzle-orm'
import 'server-only'

import { db } from '@/db/client'
import { emailLogs, smtpAccounts } from '@/db/schema/settings'

import type { SMTPAccountPurpose } from './config'

// ============================================================================
// Types
// ============================================================================

export interface CreateEmailLogInput {
  cc?: string[]
  errorMessage?: string
  messageId?: string
  metadata?: Record<string, unknown>
  recipient: string
  sentAt?: Date
  smtpAccountId?: string
  status: EmailLogStatus
  subject: string
  templateId?: string
}

export interface EmailLogEntry {
  cc: string[] | null
  createdAt: Date
  errorMessage: string | null
  id: string
  messageId: string | null
  metadata: Record<string, unknown> | null
  recipient: string
  sentAt: Date | null
  smtpAccountId: string | null
  status: EmailLogStatus
  subject: string
  templateId: string | null
}

export interface EmailLogFilter {
  limit?: number
  offset?: number
  recipient?: string
  status?: EmailLogStatus
}

export type EmailLogStatus = 'failed' | 'pending' | 'sent'

// ============================================================================
// Email Logging Functions
// ============================================================================

/**
 * 오래된 이메일 로그를 삭제합니다.
 * @param olderThanDays 삭제할 기준 일수 (기본 90일)
 */
export async function cleanupOldEmailLogs(olderThanDays: number = 90): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

  // 먼저 삭제 대상 개수를 조회
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(emailLogs)
    .where(sql`${emailLogs.createdAt} < ${cutoffDate}`)

  const count = Number(countResult?.count || 0)

  if (count > 0) {
    await db.delete(emailLogs).where(sql`${emailLogs.createdAt} < ${cutoffDate}`)
  }

  return count
}

/**
 * 이메일 발송 로그를 기록합니다.
 */
export async function createEmailLog(input: CreateEmailLogInput): Promise<EmailLogEntry> {
  const [log] = await db
    .insert(emailLogs)
    .values({
      id: `email_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      smtpAccountId: input.smtpAccountId || null,
      templateId: input.templateId || null,
      recipient: input.recipient,
      cc: input.cc || null,
      subject: input.subject,
      status: input.status,
      errorMessage: input.errorMessage || null,
      messageId: input.messageId || null,
      metadata: input.metadata || null,
      sentAt: input.sentAt || (input.status === 'sent' ? new Date() : null),
      createdAt: new Date(),
    })
    .returning()

  return {
    id: log.id,
    smtpAccountId: log.smtpAccountId,
    templateId: log.templateId,
    recipient: log.recipient,
    cc: log.cc as string[] | null,
    subject: log.subject,
    status: log.status as EmailLogStatus,
    errorMessage: log.errorMessage,
    messageId: log.messageId,
    metadata: log.metadata as Record<string, unknown> | null,
    sentAt: log.sentAt,
    createdAt: log.createdAt,
  }
}

/**
 * 이메일 로그 목록을 조회합니다.
 */
export async function getEmailLogs(filter: EmailLogFilter = {}): Promise<{
  logs: EmailLogEntry[]
  total: number
}> {
  const limit = filter.limit || 50
  const offset = filter.offset || 0

  const conditions = []
  if (filter.status) {
    conditions.push(eq(emailLogs.status, filter.status))
  }
  if (filter.recipient) {
    conditions.push(eq(emailLogs.recipient, filter.recipient))
  }

  const [logs, countResult] = await Promise.all([
    db
      .select()
      .from(emailLogs)
      .where(conditions.length > 0 ? sql`${conditions.map((c) => c).join(' AND ')}` : undefined)
      .orderBy(desc(emailLogs.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(emailLogs)
      .where(conditions.length > 0 ? sql`${conditions.map((c) => c).join(' AND ')}` : undefined),
  ])

  return {
    logs: logs.map((log) => ({
      id: log.id,
      smtpAccountId: log.smtpAccountId,
      templateId: log.templateId,
      recipient: log.recipient,
      cc: log.cc as string[] | null,
      subject: log.subject,
      status: log.status as EmailLogStatus,
      errorMessage: log.errorMessage,
      messageId: log.messageId,
      metadata: log.metadata as Record<string, unknown> | null,
      sentAt: log.sentAt,
      createdAt: log.createdAt,
    })),
    total: Number(countResult[0]?.count || 0),
  }
}

/**
 * SMTP 계정 ID를 용도로 조회합니다.
 */
export async function getSmtpAccountIdByPurpose(purpose: SMTPAccountPurpose): Promise<string | null> {
  const [account] = await db
    .select({ id: smtpAccounts.id })
    .from(smtpAccounts)
    .where(eq(smtpAccounts.purpose, purpose))
    .limit(1)

  return account?.id || null
}

/**
 * 이메일 로그를 업데이트합니다. (pending -> sent/failed)
 */
export async function updateEmailLog(
  id: string,
  updates: Partial<Pick<CreateEmailLogInput, 'errorMessage' | 'messageId' | 'sentAt' | 'status'>>,
): Promise<void> {
  await db
    .update(emailLogs)
    .set({
      status: updates.status,
      errorMessage: updates.errorMessage,
      messageId: updates.messageId,
      sentAt: updates.sentAt || (updates.status === 'sent' ? new Date() : undefined),
    })
    .where(eq(emailLogs.id, id))
}

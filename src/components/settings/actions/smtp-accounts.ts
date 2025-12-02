'use server'

import { eq } from 'drizzle-orm'

import type { SMTPAccountPurpose } from '@/lib/email/config'

import { db } from '@/db/client'
import { smtpAccounts } from '@/db/schema/settings'
import { SMTP_DEFAULT_PORT } from '@/lib/email/config'
import { testSMTPConnection } from '@/lib/email/send'
import { decrypt, encrypt, maskPassword } from '@/utils/crypto'

// ============================================================================
// Types
// ============================================================================

export interface SMTPAccountDisplay {
  createdAt: Date
  enabled: boolean
  fromName: string
  hasPassword: boolean
  host: string
  id: string
  isDefault: boolean
  maskedPassword: string
  name: string
  port: number
  purpose: SMTPAccountPurpose
  updatedAt: Date
  username: string
}

export interface SMTPAccountFormData {
  enabled: boolean
  fromName: string
  host: string
  name: string
  password: string
  port: number
  purpose: SMTPAccountPurpose
  username: string
}

interface ActionResult {
  error?: string
  message?: string
  success: boolean
}

// ============================================================================
// SMTP Account Actions
// ============================================================================

/**
 * SMTP 계정을 삭제합니다.
 */
export async function deleteSmtpAccountAction(id: string): Promise<ActionResult> {
  try {
    await db.delete(smtpAccounts).where(eq(smtpAccounts.id, id))

    return {
      success: true,
      message: 'SMTP 계정이 삭제되었습니다.',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '계정 삭제 중 오류가 발생했습니다.'
    return { success: false, error: errorMessage }
  }
}

/**
 * 용도별 SMTP 계정을 조회합니다.
 */
export async function getSmtpAccountByPurposeAction(purpose: SMTPAccountPurpose): Promise<{
  account: SMTPAccountDisplay | null
  success: boolean
  error?: string
}> {
  try {
    const [account] = await db.select().from(smtpAccounts).where(eq(smtpAccounts.purpose, purpose)).limit(1)

    if (!account) {
      return { success: true, account: null }
    }

    let maskedPassword = ''
    let hasPassword = false

    if (account.password) {
      try {
        const decrypted = decrypt(account.password)
        maskedPassword = maskPassword(decrypted)
        hasPassword = true
      } catch {
        maskedPassword = ''
        hasPassword = false
      }
    }

    return {
      success: true,
      account: {
        id: account.id,
        name: account.name,
        purpose: account.purpose as SMTPAccountPurpose,
        host: account.host,
        port: account.port,
        username: account.username,
        hasPassword,
        maskedPassword,
        fromName: account.fromName || '',
        isDefault: account.isDefault || false,
        enabled: account.enabled ?? true,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '계정을 불러오는 중 오류가 발생했습니다.'
    return { success: false, account: null, error: errorMessage }
  }
}

/**
 * 모든 SMTP 계정 목록을 조회합니다.
 */
export async function getSmtpAccountsAction(): Promise<{
  accounts: SMTPAccountDisplay[]
  success: boolean
  error?: string
}> {
  try {
    const accounts = await db.select().from(smtpAccounts).orderBy(smtpAccounts.createdAt)

    const displayAccounts: SMTPAccountDisplay[] = accounts.map((account) => {
      let maskedPassword = ''
      let hasPassword = false

      if (account.password) {
        try {
          const decrypted = decrypt(account.password)
          maskedPassword = maskPassword(decrypted)
          hasPassword = true
        } catch {
          maskedPassword = ''
          hasPassword = false
        }
      }

      return {
        id: account.id,
        name: account.name,
        purpose: account.purpose as SMTPAccountPurpose,
        host: account.host,
        port: account.port,
        username: account.username,
        hasPassword,
        maskedPassword,
        fromName: account.fromName || '',
        isDefault: account.isDefault || false,
        enabled: account.enabled ?? true,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      }
    })

    return { success: true, accounts: displayAccounts }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '계정 목록을 불러오는 중 오류가 발생했습니다.'
    return { success: false, accounts: [], error: errorMessage }
  }
}

/**
 * SMTP 계정의 연결을 테스트합니다.
 */
export async function testSmtpAccountConnectionAction(purpose: SMTPAccountPurpose): Promise<ActionResult> {
  try {
    const result = await testSMTPConnection(purpose)

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

/**
 * SMTP 계정의 활성화/비활성화 상태를 토글합니다.
 */
export async function toggleSmtpAccountAction(id: string): Promise<ActionResult> {
  try {
    const [account] = await db
      .select({ enabled: smtpAccounts.enabled })
      .from(smtpAccounts)
      .where(eq(smtpAccounts.id, id))
      .limit(1)

    if (!account) {
      return { success: false, error: '계정을 찾을 수 없습니다.' }
    }

    await db
      .update(smtpAccounts)
      .set({
        enabled: !account.enabled,
        updatedAt: new Date(),
      })
      .where(eq(smtpAccounts.id, id))

    return {
      success: true,
      message: account.enabled ? '계정이 비활성화되었습니다.' : '계정이 활성화되었습니다.',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '상태 변경 중 오류가 발생했습니다.'
    return { success: false, error: errorMessage }
  }
}

/**
 * SMTP 계정을 생성하거나 업데이트합니다.
 * purpose 기준으로 upsert 처리됩니다.
 */
export async function upsertSmtpAccountAction(data: SMTPAccountFormData): Promise<ActionResult> {
  try {
    const encryptedPassword = data.password ? encrypt(data.password) : ''

    // 기존 계정 확인
    const [existing] = await db.select().from(smtpAccounts).where(eq(smtpAccounts.purpose, data.purpose)).limit(1)

    if (existing) {
      // 업데이트 - 비밀번호가 없으면 기존 값 유지
      const updateData: Record<string, unknown> = {
        name: data.name,
        host: data.host,
        port: data.port || SMTP_DEFAULT_PORT,
        username: data.username,
        fromName: data.fromName,
        enabled: data.enabled,
        updatedAt: new Date(),
      }

      if (data.password) {
        updateData.password = encryptedPassword
      }

      await db.update(smtpAccounts).set(updateData).where(eq(smtpAccounts.id, existing.id))

      return {
        success: true,
        message: 'SMTP 계정이 업데이트되었습니다.',
      }
    } else {
      // 생성
      if (!data.password) {
        return {
          success: false,
          error: '새 계정을 생성하려면 비밀번호가 필요합니다.',
        }
      }

      await db.insert(smtpAccounts).values({
        id: `smtp_${data.purpose}_${Date.now()}`,
        name: data.name,
        purpose: data.purpose,
        host: data.host,
        port: data.port || SMTP_DEFAULT_PORT,
        username: data.username,
        password: encryptedPassword,
        fromName: data.fromName,
        isDefault: false,
        enabled: data.enabled,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      return {
        success: true,
        message: 'SMTP 계정이 생성되었습니다.',
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '계정 저장 중 오류가 발생했습니다.'
    return { success: false, error: errorMessage }
  }
}

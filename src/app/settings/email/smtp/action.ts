'use server'

import { eq } from 'drizzle-orm'
import { ActionResult } from 'next/dist/shared/lib/app-router-types'
import { headers } from 'next/headers'

import { db } from '@/db/client'
import { smtpAccount } from '@/db/schema/settings'
import { auth } from '@/lib/auth'
import { SMTP_DEFAULT_PORT, SMTPAccountFormData } from '@/lib/email/common'
import { testSMTPConnection } from '@/lib/email/send'
import { decrypt, encrypt, maskPassword } from '@/utils/crypto'

export async function getSMTPAccountAction() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    const email = session?.user?.email

    if (!email) {
      return null
    }

    const [account] = await db
      .select({
        host: smtpAccount.host,
        email: smtpAccount.email,
        password: smtpAccount.password,
        fromName: smtpAccount.fromName,
      })
      .from(smtpAccount)
      .where(eq(smtpAccount.email, email))

    if (!account) {
      return null
    }

    const { maskedPassword, hasPassword } = getPasswordInfo(account.password)

    return {
      host: account.host,
      email: account.email,
      hasPassword,
      maskedPassword,
      fromName: account.fromName || '',
    }
  } catch {
    return null
  }
}

export async function testSMTPAccountConnectionAction() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    const email = session?.user?.email

    if (!email) {
      return null
    }

    const isConnected = await testSMTPConnection(email)

    if (!isConnected) {
      return {
        success: false,
        error: '이메일 서버에 연결할 수 없어요',
      }
    }

    return {
      success: true,
      message: '이메일 서버에 연결됐어요',
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '이메일 서버에 연결할 수 없어요',
    }
  }
}

export async function upsertSMTPAccountAction(data: SMTPAccountFormData): Promise<ActionResult> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    const email = session?.user?.email

    if (!email) {
      return { error: '로그인이 필요해요' }
    }

    const encryptedPassword = data.password ? encrypt(data.password) : null

    if (encryptedPassword) {
      await db
        .insert(smtpAccount)
        .values({
          name: data.name,
          email,
          host: data.host,
          port: SMTP_DEFAULT_PORT,
          password: encryptedPassword,
          fromName: data.fromName,
          isDefault: false,
          enabled: data.enabled,
        })
        .onConflictDoUpdate({
          target: smtpAccount.email,
          set: {
            name: data.name,
            host: data.host,
            port: SMTP_DEFAULT_PORT,
            password: encryptedPassword,
            fromName: data.fromName,
            enabled: data.enabled,
          },
        })
    } else {
      const [updated] = await db
        .update(smtpAccount)
        .set({
          name: data.name,
          host: data.host,
          port: SMTP_DEFAULT_PORT,
          fromName: data.fromName,
          enabled: data.enabled,
        })
        .where(eq(smtpAccount.email, email))
        .returning({ id: smtpAccount.id })

      if (!updated) {
        return { error: '새 계정을 생성하려면 비밀번호가 필요해요' }
      }
    }

    return {
      success: true,
      message: '이메일 서버 설정이 저장됐어요',
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '이메일 서버 설정을 저장하지 못했어요',
    }
  }
}

function getPasswordInfo(encryptedPassword: string | null): { maskedPassword: string; hasPassword: boolean } {
  if (!encryptedPassword) {
    return { maskedPassword: '', hasPassword: false }
  }

  try {
    const decrypted = decrypt(encryptedPassword)
    return { maskedPassword: maskPassword(decrypted), hasPassword: true }
  } catch {
    return { maskedPassword: '', hasPassword: false }
  }
}

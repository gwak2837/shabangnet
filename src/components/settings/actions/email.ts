'use server'

import { eq } from 'drizzle-orm'
import ms from 'ms'
import { headers } from 'next/headers'

import { getBaseURL } from '@/common/constants'
import { env } from '@/common/env'
import { db } from '@/db/client'
import { user, verification } from '@/db/schema/auth'
import { auth } from '@/lib/auth'
import { sendEmail } from '@/lib/email/send'

interface EmailVerificationStatus {
  email: string
  emailVerified: boolean
}

interface SendVerificationResult {
  error?: string
  success?: string
}

export async function getEmailVerificationStatus(): Promise<EmailVerificationStatus | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return null
  }

  const [userData] = await db
    .select({
      email: user.email,
      emailVerified: user.emailVerified,
    })
    .from(user)
    .where(eq(user.id, session.user.id))

  if (!userData) {
    return null
  }

  return {
    email: userData.email,
    emailVerified: userData.emailVerified,
  }
}

export async function sendVerificationEmail(): Promise<SendVerificationResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    return { error: '로그인이 필요해요.' }
  }

  const [userData] = await db
    .select({
      email: user.email,
      emailVerified: user.emailVerified,
    })
    .from(user)
    .where(eq(user.id, session.user.id))

  if (!userData) {
    return { error: '사용자를 찾을 수 없어요.' }
  }

  if (userData.emailVerified) {
    return { error: '이미 인증된 이메일이에요.' }
  }

  const token = crypto.randomUUID()
  const expires = new Date(Date.now() + ms('1h'))

  // 기존 토큰 삭제 후 새 토큰 생성
  await db.delete(verification).where(eq(verification.identifier, userData.email))

  await db.insert(verification).values({
    id: crypto.randomUUID(),
    identifier: userData.email,
    value: token,
    expiresAt: expires,
  })

  const verifyUrl = `${getBaseURL()}/verify-email?token=${token}`

  try {
    await sendEmail({
      to: userData.email,
      subject: '이메일 인증 - 다온 OMS',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>이메일 인증</h2>
          <p>아래 버튼을 클릭하여 이메일을 인증해주세요.</p>
          <p style="margin: 24px 0;">
            <a href="${verifyUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              이메일 인증하기
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">
            이 링크는 1시간 동안 유효합니다.<br/>
            본인이 요청하지 않았다면 이 이메일을 무시해주세요.
          </p>
        </div>
      `,
    })

    return { success: '인증 이메일이 전송됐어요. 이메일을 확인해주세요.' }
  } catch (error) {
    console.error('Failed to send verification email:', error)
    return { error: '이메일 전송에 실패했어요. 잠시 후 다시 시도해주세요.' }
  }
}

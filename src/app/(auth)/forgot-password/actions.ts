'use server'

import { eq } from 'drizzle-orm'
import ms from 'ms'
import { z } from 'zod'

import { db } from '@/db/client'
import { passwordResetTokens, users } from '@/db/schema/auth'
import { sendEmail } from '@/lib/email'

const ForgotPasswordSchema = z.object({
  email: z.email('올바른 이메일 형식이 아니에요'),
})

const successMessage = '이메일이 등록되어 있다면 비밀번호 재설정 링크가 전송돼요'
const RATE_LIMIT_COOLDOWN_MS = ms('1m')

export async function requestPasswordReset(prevState: unknown, formData: FormData) {
  const validatedFields = ForgotPasswordSchema.safeParse(Object.fromEntries(formData))

  if (!validatedFields.success) {
    return { error: '올바른 이메일을 입력해주세요' }
  }

  const { email } = validatedFields.data
  const normalizedEmail = email.toLowerCase()
  const cooldownThreshold = new Date(Date.now() - RATE_LIMIT_COOLDOWN_MS)

  const [result] = await db
    .select({
      userId: users.id,
      hasPassword: users.password,
      tokenCreatedAt: passwordResetTokens.createdAt,
    })
    .from(users)
    .leftJoin(passwordResetTokens, eq(users.email, passwordResetTokens.email))
    .where(eq(users.email, normalizedEmail))

  if (!result || !result.hasPassword) {
    return { success: successMessage }
  }

  if (result.tokenCreatedAt && result.tokenCreatedAt > cooldownThreshold) {
    return { success: successMessage }
  }

  const token = crypto.randomUUID()
  const expires = new Date(Date.now() + ms('1h'))

  await db
    .insert(passwordResetTokens)
    .values({
      email: normalizedEmail,
      token,
      expires,
    })
    .onConflictDoUpdate({
      target: passwordResetTokens.email,
      set: {
        token,
        expires,
        createdAt: new Date(),
        usedAt: null, // 이전에 사용된 토큰이면 초기화
      },
    })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const resetUrl = `${appUrl}/reset-password?token=${token}`

  await sendEmail({
    to: normalizedEmail,
    subject: '[다온 OMS] 비밀번호 재설정',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">비밀번호 재설정</h2>
        <p>안녕하세요,</p>
        <p>비밀번호 재설정 요청이 접수되었습니다.</p>
        <p>아래 버튼을 클릭하여 새 비밀번호를 설정해주세요:</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" 
             style="background-color: #0070f3; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            비밀번호 재설정
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          이 링크는 1시간 동안 유효합니다.
        </p>
        <p style="color: #666; font-size: 14px;">
          본인이 요청하지 않았다면 이 이메일을 무시해주세요.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">
          이 이메일은 자동으로 발송되었습니다. 회신하지 마세요.
        </p>
      </div>
    `,
  })

  return { success: successMessage }
}

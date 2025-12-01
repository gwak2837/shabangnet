'use server'

import bcrypt from 'bcryptjs'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { z } from 'zod'

import { isCommonPassword } from '@/common/constants/common-passwords'
import { db } from '@/db/client'
import { passwordResetTokens, users } from '@/db/schema/auth'
import { PASSWORD_ERROR_MESSAGES, passwordSchema } from '@/utils/password'

const ResetPasswordSchema = z
  .object({
    token: z.string().min(1, '토큰이 필요해요'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: PASSWORD_ERROR_MESSAGES.mismatch,
    path: ['confirmPassword'],
  })
  .refine((data) => !isCommonPassword(data.password), {
    message: PASSWORD_ERROR_MESSAGES.isCommon,
    path: ['password'],
  })

const errorMessage = '만료된 토큰이거나 사용자를 찾을 수 없어요'

export async function resetPassword(prevState: unknown, formData: FormData) {
  const validatedFields = ResetPasswordSchema.safeParse(Object.fromEntries(formData))

  if (!validatedFields.success) {
    const firstError = validatedFields.error.issues[0]
    return { error: firstError?.message || '유효하지 않은 값이에요' }
  }

  const { token, password } = validatedFields.data
  const hashedPassword = await bcrypt.hash(password, 10)

  const result = await db.transaction(async (tx) => {
    const [updatedToken] = await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokens.token, token),
          gt(passwordResetTokens.expires, new Date()),
          isNull(passwordResetTokens.usedAt),
        ),
      )
      .returning({ email: passwordResetTokens.email })

    if (!updatedToken) {
      return { error: errorMessage }
    }

    const [updatedUser] = await tx
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.email, updatedToken.email))
      .returning({ id: users.id })

    if (!updatedUser) {
      return { error: errorMessage }
    }

    return { success: true }
  })

  if ('error' in result) {
    return result
  }

  return { success: '비밀번호가 변경됐어요. 새 비밀번호로 로그인해주세요.' }
}

/**
 * 토큰 유효성 검증 (페이지 로드 시 사용)
 */
export async function validateResetToken(token: string): Promise<{ valid: boolean; error?: string }> {
  const [validToken] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        gt(passwordResetTokens.expires, new Date()),
        isNull(passwordResetTokens.usedAt),
      ),
    )

  if (!validToken) {
    return { valid: false, error: '유효하지 않거나 만료된 토큰이에요' }
  }

  return { valid: true }
}

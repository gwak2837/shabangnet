'use server'

import bcrypt from 'bcryptjs'
import ms from 'ms'
import { z } from 'zod'

import { isCommonPassword } from '@/common/constants/common-passwords'
import { PostgresErrorCodes } from '@/common/constants/db-errors'
import { db } from '@/db/client'
import { roles, users, usersToRoles, verificationTokens } from '@/db/schema/auth'
import { sendEmail } from '@/lib/email'
import { PASSWORD_ERROR_MESSAGES, passwordSchema } from '@/utils/password'

const RegisterSchema = z
  .object({
    email: z.email('올바른 이메일 형식이 아니에요'),
    password: passwordSchema,
    confirmPassword: z.string(),
    name: z.string().min(2, '이름은 2자 이상이어야 해요').max(100, '이름은 100자 이하여야 해요'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: PASSWORD_ERROR_MESSAGES.mismatch,
    path: ['confirmPassword'],
  })
  .refine((data) => !isCommonPassword(data.password), {
    message: PASSWORD_ERROR_MESSAGES.isCommon,
    path: ['password'],
  })

export async function register(_prevState: unknown, formData: FormData) {
  const validatedFields = RegisterSchema.safeParse(Object.fromEntries(formData))

  if (!validatedFields.success) {
    const firstError = validatedFields.error.issues[0]
    return { error: firstError?.message || '유효하지 않은 값이에요' }
  }

  const { email, password, name } = validatedFields.data
  const hashedPassword = await bcrypt.hash(password, 10)

  try {
    return await db.transaction(async (tx) => {
      // 사용자 생성
      const [newUser] = await tx
        .insert(users)
        .values({
          email,
          name,
          password: hashedPassword,
        })
        .returning()
        .catch((err) => {
          if (err && typeof err === 'object' && 'code' in err && err.code === PostgresErrorCodes.UNIQUE_VIOLATION) {
            throw new Error('이메일이 이미 사용 중이에요')
          }
          throw err
        })

      // 기본 권한 할당
      const [customerRole] = await tx
        .insert(roles)
        .values({ name: 'customer', description: 'General customer' })
        .onConflictDoUpdate({
          target: roles.name,
          set: { updatedAt: new Date() },
        })
        .returning()

      await tx.insert(usersToRoles).values({
        userId: newUser.id,
        roleId: customerRole.id,
      })

      // 인증 토큰 생성
      const token = crypto.randomUUID()
      const expires = new Date(new Date().getTime() + ms('1h'))

      await tx.insert(verificationTokens).values({
        identifier: email,
        token,
        expires,
      })

      // 인증 이메일 전송
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const verifyUrl = `${appUrl}/verify-email?token=${token}`

      await sendEmail({
        to: email,
        subject: 'Verify your email',
        html: `<p>Click <a href="${verifyUrl}">here</a> to verify your email.</p>`,
      })

      return { success: '인증 이메일이 전송됐어요' }
    })
  } catch (error) {
    if (error instanceof Error && error.message === '이메일이 이미 사용 중이에요') {
      return { error: error.message }
    }
    console.error(error)
    return { error: '알 수 없는 오류가 발생했어요' }
  }
}

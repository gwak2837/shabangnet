'use server'

import { hashPassword } from 'better-auth/crypto'
import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { z } from 'zod'

import { isCommonPassword } from '@/common/constants/common-passwords'
import { db } from '@/db/client'
import { account } from '@/db/schema/auth'
import { auth } from '@/lib/auth'

// MFA 관련 액션은 better-auth의 two-factor 및 passkey 플러그인을 통해
// 클라이언트에서 직접 호출됩니다.
//
// - TOTP 설정: authClient.twoFactor.enable()
// - TOTP 검증: authClient.twoFactor.verifyTotp()
// - TOTP 비활성화: authClient.twoFactor.disable()
// - 백업 코드 생성: authClient.twoFactor.generateBackupCodes()
// - 패스키 등록: authClient.passkey.addPasskey()
// - 패스키 삭제: authClient.passkey.deletePasskey()

// ============================================================================
// Types
// ============================================================================

interface ActionResult {
  error?: string
  success: boolean
}

// ============================================================================
// Validation Schemas
// ============================================================================

const SetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, '비밀번호는 8자 이상이어야 해요')
      .max(100, '비밀번호가 너무 길어요')
      .regex(/[A-Z]/, '대문자를 포함해야 해요')
      .regex(/[a-z]/, '소문자를 포함해야 해요')
      .regex(/[0-9]/, '숫자를 포함해야 해요'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않아요',
    path: ['confirmPassword'],
  })
  .refine((data) => !isCommonPassword(data.password), {
    message: '너무 흔한 비밀번호에요',
    path: ['password'],
  })

// ============================================================================
// Actions
// ============================================================================

/**
 * 비밀번호가 없는 사용자(패스키/소셜 로그인)를 위한 비밀번호 설정
 */
export async function setPasswordAction(formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user?.id) {
      return { success: false, error: '로그인이 필요합니다.' }
    }

    const userId = session.user.id

    // 이미 비밀번호가 있는지 확인
    const [existingCredential] = await db
      .select({ password: account.password })
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')))

    if (existingCredential?.password) {
      return { success: false, error: '이미 비밀번호가 설정되어 있습니다.' }
    }

    // 유효성 검증
    const validatedFields = SetPasswordSchema.safeParse({
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
    })

    if (!validatedFields.success) {
      const firstError = validatedFields.error.issues[0]
      return { success: false, error: firstError?.message || '유효하지 않은 값이에요' }
    }

    const { password } = validatedFields.data
    const hashedPassword = await hashPassword(password)

    // credential 계정이 없으면 생성, 있으면 비밀번호 업데이트
    if (!existingCredential) {
      // 새 credential 계정 생성
      await db.insert(account).values({
        id: `credential_${userId}_${Date.now()}`,
        userId,
        accountId: userId,
        providerId: 'credential',
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    } else {
      // 기존 계정에 비밀번호 설정
      await db
        .update(account)
        .set({ password: hashedPassword, updatedAt: new Date() })
        .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')))
    }

    return { success: true }
  } catch (error) {
    console.error('Set password error:', error)
    return { success: false, error: '비밀번호 설정에 실패했습니다.' }
  }
}

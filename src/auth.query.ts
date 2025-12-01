import { and, count, desc, eq, gt, sql } from 'drizzle-orm'

import { db } from '@/db/client'
import { accountLocks, loginAttempts, roles, users, usersToRoles } from '@/db/schema/auth'
import { sendEmail } from '@/lib/email'

const LOGIN_LIMIT_CONFIG = {
  maxAttempts: 5,
  windowMinutes: 5,
} as const

export interface LoginAttemptResult {
  attemptsRemaining?: number
  isLocked: boolean
  lockEmailSent?: boolean
  wasAlreadyLocked: boolean
}

export async function getUserRoles(userId: string) {
  try {
    const userRoles = await db
      .select({
        name: roles.name,
      })
      .from(usersToRoles)
      .innerJoin(roles, eq(usersToRoles.roleId, roles.id))
      .where(eq(usersToRoles.userId, userId))

    return userRoles.map((r) => r.name)
  } catch (error) {
    console.error('getUserRoles:', error)
    return []
  }
}

export async function getUserWithRoles(userId: string) {
  try {
    const result = await db
      .select({
        user: users,
        roleName: roles.name,
      })
      .from(users)
      .leftJoin(usersToRoles, eq(users.id, usersToRoles.userId))
      .leftJoin(roles, eq(usersToRoles.roleId, roles.id))
      .where(eq(users.id, userId))

    if (result.length === 0) {
      return null
    }

    const user = result[0].user
    const userRoles = result.filter((r) => r.roleName !== null).map((r) => r.roleName!)

    return {
      ...user,
      roles: userRoles,
    }
  } catch (error) {
    console.error('getUserWithRoles:', error)
    return null
  }
}

export async function processLoginAttempt(
  email: string,
  success: boolean,
  ipAddress?: string,
): Promise<LoginAttemptResult> {
  const normalizedEmail = email.toLowerCase()

  let shouldSendLockEmail = false
  let unlockToken: string | null = null

  const result = await db.transaction(async (tx) => {
    // Drizzle ORM이 FOR UPDATE를 지원하지 않아 raw SQL 사용
    const lockRows = await tx.execute(
      sql`SELECT id FROM account_locks WHERE email = ${normalizedEmail} AND unlocked_at IS NULL FOR UPDATE`,
    )

    if (lockRows.length > 0) {
      await tx.insert(loginAttempts).values({ email: normalizedEmail, ipAddress, success: false })
      return { isLocked: true, wasAlreadyLocked: true }
    }

    // 로그인 시도 기록
    await tx.insert(loginAttempts).values({ email: normalizedEmail, ipAddress, success })

    if (success) {
      return { isLocked: false, wasAlreadyLocked: false }
    }

    // 실패 횟수 확인 (마지막 잠금 해제 시점 이후만 카운트)
    const [lastUnlock] = await tx
      .select({ unlockedAt: accountLocks.unlockedAt })
      .from(accountLocks)
      .where(eq(accountLocks.email, normalizedEmail))
      .orderBy(desc(accountLocks.unlockedAt))
      .limit(1)

    const oneHourAgo = Date.now() - LOGIN_LIMIT_CONFIG.windowMinutes * 60 * 1000
    const lastUnlockTime = lastUnlock?.unlockedAt?.getTime() ?? 0
    const windowStart = new Date(Math.max(oneHourAgo, lastUnlockTime))

    const [failedCount] = await tx
      .select({ count: count() })
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.email, normalizedEmail),
          eq(loginAttempts.success, false),
          gt(loginAttempts.attemptedAt, windowStart),
        ),
      )

    const failedAttempts = failedCount?.count ?? 0
    const attemptsRemaining = Math.max(0, LOGIN_LIMIT_CONFIG.maxAttempts - failedAttempts)

    // 최대 시도 횟수 초과 시 계정 잠금
    if (failedAttempts >= LOGIN_LIMIT_CONFIG.maxAttempts) {
      unlockToken = crypto.randomUUID()

      await tx
        .insert(accountLocks)
        .values({ email: normalizedEmail, unlockToken })
        .onConflictDoUpdate({
          target: accountLocks.email,
          set: { unlockToken, lockedAt: new Date(), unlockedAt: null },
        })

      shouldSendLockEmail = true
      return { isLocked: true, wasAlreadyLocked: false, attemptsRemaining: 0 }
    }

    return { isLocked: false, wasAlreadyLocked: false, attemptsRemaining }
  })

  // 트랜잭션 커밋 후 이메일 발송
  if (shouldSendLockEmail && unlockToken) {
    const emailSent = await sendLockEmail(normalizedEmail, unlockToken)
    return { ...result, lockEmailSent: emailSent }
  }

  return result
}

async function sendLockEmail(email: string, unlockToken: string): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const unlockUrl = `${appUrl}/unlock-account?token=${unlockToken}`
  const resetUrl = `${appUrl}/forgot-password`

  const result = await sendEmail({
    to: email,
    subject: '[다온 OMS] 계정이 일시적으로 잠겼어요',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">계정 보안 알림</h2>
        <p>안녕하세요,</p>
        <p>여러 번의 로그인 실패로 인해 계정이 일시적으로 잠겼습니다.</p>
        <p>본인이 시도한 경우, 아래 버튼을 클릭하여 계정 잠금을 해제할 수 있습니다:</p>
        <p style="margin: 24px 0;">
          <a href="${unlockUrl}" 
             style="background-color: #0070f3; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            계정 잠금 해제
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          비밀번호를 잊으셨나요? 
          <a href="${resetUrl}" style="color: #0070f3; text-decoration: underline;">
            비밀번호 재설정
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #666; font-size: 14px;">
          본인이 시도하지 않은 경우, 누군가가 귀하의 계정에 접근하려고 시도했을 수 있습니다.
          비밀번호를 변경하는 것을 권장드립니다.
        </p>
        <p style="color: #999; font-size: 12px;">
          이 이메일은 자동으로 발송되었습니다. 회신하지 마세요.
        </p>
      </div>
    `,
  })

  return result.success
}

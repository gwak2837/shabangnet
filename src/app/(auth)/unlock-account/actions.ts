'use server'

import { and, eq, isNull } from 'drizzle-orm'

import { db } from '@/db/client'
import { accountLocks } from '@/db/schema/auth'

export async function unlockAccountAction(token: string) {
  if (!token) {
    return { error: '잠금 해제 토큰이 필요해요' }
  }

  const [updated] = await db
    .update(accountLocks)
    .set({ unlockedAt: new Date() })
    .where(and(eq(accountLocks.unlockToken, token), isNull(accountLocks.unlockedAt)))
    .returning({ id: accountLocks.id })

  if (!updated) {
    return { error: '유효하지 않거나 이미 사용된 토큰이에요' }
  }

  return { success: '계정 잠금이 해제됐어요' }
}

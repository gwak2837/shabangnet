import { eq } from 'drizzle-orm'

import { db } from '@/db/client'
import { users } from '@/db/schema/auth'

/**
 * 특정 사용자의 모든 세션을 무효화합니다.
 */
export async function invalidateUserSessions(userId: string) {
  await db.update(users).set({ invalidateSessionsBefore: new Date() }).where(eq(users.id, userId))
}

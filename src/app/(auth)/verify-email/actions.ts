'use server'

import { and, eq, gt } from 'drizzle-orm'

import { db } from '@/db'
import { users, verificationTokens } from '@/db/schema'

export async function verifyEmailToken(token: string) {
  try {
    const [claimedToken] = await db
      .delete(verificationTokens)
      .where(and(eq(verificationTokens.token, token), gt(verificationTokens.expires, new Date())))
      .returning()

    if (!claimedToken) {
      return { error: '잘못된 인증 요청이에요' }
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        emailVerified: new Date(),
        email: claimedToken.identifier,
      })
      .where(eq(users.email, claimedToken.identifier))
      .returning({ id: users.id })

    if (!updatedUser) {
      return { error: '잘못된 인증 요청이에요' }
    }

    return { success: '이메일이 인증됐어요' }
  } catch (error) {
    console.error(error)
    return { error: '알 수 없는 오류가 발생했어요' }
  }
}

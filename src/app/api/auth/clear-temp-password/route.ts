import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { db } from '@/db/client'
import { account, passkey } from '@/db/schema/auth'
import { auth } from '@/lib/auth'

/**
 * 패스키 등록 후 임시 비밀번호를 삭제합니다.
 * 패스키가 최소 1개 이상 등록된 경우에만 비밀번호를 삭제합니다.
 */
export async function POST() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // 패스키가 등록되어 있는지 확인
    const passkeys = await db.select({ id: passkey.id }).from(passkey).where(eq(passkey.userId, userId))

    if (passkeys.length === 0) {
      return NextResponse.json({ error: '패스키가 등록되어 있지 않습니다.' }, { status: 400 })
    }

    // credential 계정의 비밀번호를 null로 설정
    await db
      .update(account)
      .set({ password: null, updatedAt: new Date() })
      .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Clear temp password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


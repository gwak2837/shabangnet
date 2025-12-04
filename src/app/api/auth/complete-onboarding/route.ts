import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { db } from '@/db/client'
import { passkey, user } from '@/db/schema/auth'
import { auth } from '@/lib/auth'

export async function POST() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasTOTP = session.user.twoFactorEnabled === true
    const userPasskeys = await db.select().from(passkey).where(eq(passkey.userId, session.user.id))
    const hasPasskey = userPasskeys.length > 0

    if (!hasTOTP && !hasPasskey) {
      return NextResponse.json({ error: '2FA 설정이 필요합니다' }, { status: 400 })
    }

    // 온보딩 완료 업데이트
    await db
      .update(user)
      .set({
        onboardingComplete: true,
        updatedAt: new Date(),
      })
      .where(eq(user.id, session.user.id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Complete onboarding error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db/client'
import { user } from '@/db/schema/auth'
import { auth } from '@/lib/auth'
import { getUserList, type UserStatus } from '@/services/users'
import { createCacheControl } from '@/utils/cache-control'

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [currentUser] = await db.select({ isAdmin: user.isAdmin }).from(user).where(eq(user.id, session.user.id))

  if (!currentUser?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') as 'all' | UserStatus | null
  const cursor = searchParams.get('cursor') ?? undefined
  const limit = parseInt(searchParams.get('limit') ?? '20', 10)

  try {
    const result = await getUserList({
      status: status ?? 'all',
      cursor,
      limit,
    })

    return NextResponse.json(result, {
      headers: { 'Cache-Control': createCacheControl({ private: true, maxAge: 0 }) },
    })
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

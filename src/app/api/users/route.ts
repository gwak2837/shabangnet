import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

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

  // TODO: 역할 기반 권한 체크 구현 필요
  // 현재는 모든 로그인 사용자가 접근 가능

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') as 'all' | UserStatus | null
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const limit = parseInt(searchParams.get('limit') ?? '20', 10)

  try {
    const result = await getUserList({
      status: status ?? 'all',
      page,
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

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { db } from '@/db/client'
import { manufacturer } from '@/db/schema/manufacturers'
import { auth } from '@/lib/auth'
import { createCacheControl } from '@/utils/cache-control'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const manufacturers = await db
      .select({
        id: manufacturer.id,
        name: manufacturer.name,
      })
      .from(manufacturer)
      .orderBy(manufacturer.name)

    const cacheControl = createCacheControl({
      private: true,
      maxAge: 300,
      swr: 600,
    })

    return NextResponse.json(manufacturers, { headers: { 'Cache-Control': cacheControl } })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

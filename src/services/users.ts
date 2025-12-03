import { desc, eq, sql } from 'drizzle-orm'

import { db } from '@/db/client'
import { user } from '@/db/schema/auth'

export interface UserListItem {
  authType: 'passkey' | 'password' | 'social'
  createdAt: Date
  email: string
  emailVerified: boolean
  id: string
  isAdmin: boolean
  name: string | null
  status: UserStatus
}

export interface UserListParams {
  limit?: number
  page?: number
  status?: 'all' | UserStatus
}

export interface UserListResult {
  limit: number
  page: number
  total: number
  totalPages: number
  users: UserListItem[]
}

export type UserStatus = 'approved' | 'pending' | 'rejected'

export async function getUserList(params: UserListParams = {}): Promise<UserListResult> {
  const { status = 'all', page = 1, limit = 20 } = params
  const offset = (page - 1) * limit

  // Build where clause
  const whereClause = status !== 'all' ? eq(user.status, status) : undefined

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(user)
    .where(whereClause)

  const userList = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      status: user.status,
      authType: user.authType,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(whereClause)
    .orderBy(desc(user.createdAt))
    .limit(limit)
    .offset(offset)

  const users: UserListItem[] = userList.map((u) => ({
    ...u,
    status: u.status as UserStatus,
    authType: u.authType as 'passkey' | 'password' | 'social',
  }))

  return {
    users,
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  }
}

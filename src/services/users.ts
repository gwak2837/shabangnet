import { and, desc, eq, lt, or, sql } from 'drizzle-orm'
import { z } from 'zod'

import { decodeCursor, encodeCursor } from '@/app/api/util/cursor'
import { db } from '@/db/client'
import { user } from '@/db/schema/auth'

export interface UserListItem {
  createdAt: string
  email: string
  emailVerified: boolean
  id: string
  isAdmin: boolean
  name: string | null
  status: UserStatus
}

export interface UserListParams {
  cursor?: string
  limit?: number
  status?: 'all' | UserStatus
}

export interface UserListResult {
  limit: number
  nextCursor: string | null
  total: number
  totalPages: number
  users: UserListItem[]
}

export type UserStatus = 'approved' | 'pending' | 'rejected'

export async function getUserList(params: UserListParams = {}): Promise<UserListResult> {
  const { status = 'all', cursor, limit = 20 } = params

  // Build where clause
  const baseWhereClause = status !== 'all' ? eq(user.status, status) : undefined
  const whereConditions = []

  if (baseWhereClause) {
    whereConditions.push(baseWhereClause)
  }

  if (cursor) {
    const decoded = decodeCursor(
      cursor,
      z.object({
        createdAt: z.string().datetime(),
        id: z.string().min(1),
      }),
    )
    const cursorCreatedAt = new Date(decoded.createdAt)
    const cursorId = decoded.id

    whereConditions.push(
      or(lt(user.createdAt, cursorCreatedAt), and(eq(user.createdAt, cursorCreatedAt), lt(user.id, cursorId))),
    )
  }

  const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(user)
    .where(baseWhereClause)

  const userList = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      status: user.status,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(whereClause)
    .orderBy(desc(user.createdAt), desc(user.id))
    .limit(limit + 1)

  const hasMore = userList.length > limit
  const pageItems = hasMore ? userList.slice(0, -1) : userList
  const lastItem = pageItems[pageItems.length - 1]

  const users: UserListItem[] = pageItems.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    emailVerified: u.emailVerified,
    status: u.status as UserStatus,
    isAdmin: u.isAdmin,
    createdAt: u.createdAt.toISOString(),
  }))

  return {
    users,
    total: count,
    limit,
    totalPages: Math.ceil(count / limit),
    nextCursor:
      hasMore && lastItem ? encodeCursor({ createdAt: lastItem.createdAt.toISOString(), id: lastItem.id }) : null,
  }
}

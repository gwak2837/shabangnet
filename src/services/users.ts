import { desc, eq, sql } from 'drizzle-orm'

import { db } from '@/db/client'
import { role, user, userToRole } from '@/db/schema/auth'

export interface UserListItem {
  authType: 'passkey' | 'password' | 'social'
  createdAt: Date
  email: string
  emailVerified: boolean
  id: string
  name: string | null
  roles: string[]
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

  // Get users with roles
  const userList = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      status: user.status,
      authType: user.authType,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(whereClause)
    .orderBy(desc(user.createdAt))
    .limit(limit)
    .offset(offset)

  // Get roles for each user
  const userIds = userList.map((u) => u.id)

  const userRoles =
    userIds.length > 0
      ? await db
          .select({
            userId: userToRole.userId,
            roleName: role.name,
          })
          .from(userToRole)
          .innerJoin(role, eq(userToRole.roleId, role.id))
          .where(sql`${userToRole.userId} = ANY(${userIds})`)
      : []

  // Map roles to users
  const rolesByUserId = userRoles.reduce(
    (acc, { userId, roleName }) => {
      if (!acc[userId]) acc[userId] = []
      acc[userId].push(roleName)
      return acc
    },
    {} as Record<string, string[]>,
  )

  const usersWithRoles: UserListItem[] = userList.map((u) => ({
    ...u,
    status: u.status as UserStatus,
    authType: u.authType as 'passkey' | 'password' | 'social',
    roles: rolesByUserId[u.id] ?? [],
  }))

  return {
    users: usersWithRoles,
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  }
}

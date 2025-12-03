'use server'

import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'

import { db } from '@/db/client'
import { user } from '@/db/schema/auth'
import { auth } from '@/lib/auth'

interface ActionResult {
  error?: string
  success?: string
}

export async function approveUser(userId: string): Promise<ActionResult> {
  const isAdmin = await checkAdminRole()

  if (!isAdmin) {
    return { error: '권한이 없어요.' }
  }

  try {
    const [updatedUser] = await db
      .update(user)
      .set({ status: 'approved', updatedAt: new Date() })
      .where(eq(user.id, userId))
      .returning({ id: user.id, name: user.name })

    if (!updatedUser) {
      return { error: '사용자를 찾을 수 없어요.' }
    }

    return { success: `${updatedUser.name ?? '사용자'}님을 승인했어요.` }
  } catch (error) {
    console.error('Failed to approve user:', error)
    return { error: '승인에 실패했어요. 다시 시도해주세요.' }
  }
}

export async function reinstateUser(userId: string): Promise<ActionResult> {
  const isAdmin = await checkAdminRole()

  if (!isAdmin) {
    return { error: '권한이 없어요.' }
  }

  try {
    const [updatedUser] = await db
      .update(user)
      .set({ status: 'pending', updatedAt: new Date() })
      .where(eq(user.id, userId))
      .returning({ id: user.id, name: user.name })

    if (!updatedUser) {
      return { error: '사용자를 찾을 수 없어요.' }
    }

    return { success: `${updatedUser.name ?? '사용자'}님을 대기 상태로 복원했어요.` }
  } catch (error) {
    console.error('Failed to reinstate user:', error)
    return { error: '복원에 실패했어요. 다시 시도해주세요.' }
  }
}

export async function rejectUser(userId: string): Promise<ActionResult> {
  const isAdmin = await checkAdminRole()

  if (!isAdmin) {
    return { error: '권한이 없어요.' }
  }

  try {
    const [updatedUser] = await db
      .update(user)
      .set({ status: 'rejected', updatedAt: new Date() })
      .where(eq(user.id, userId))
      .returning({ id: user.id, name: user.name, email: user.email })

    if (!updatedUser) {
      return { error: '사용자를 찾을 수 없어요.' }
    }

    return { success: `${updatedUser.name ?? '사용자'}님의 가입을 거부했어요. 해당 이메일로 재가입이 차단됩니다.` }
  } catch (error) {
    console.error('Failed to reject user:', error)
    return { error: '거부에 실패했어요. 다시 시도해주세요.' }
  }
}

async function checkAdminRole(): Promise<boolean> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    return false
  }

  const [currentUser] = await db.select({ isAdmin: user.isAdmin }).from(user).where(eq(user.id, session.user.id))

  return currentUser?.isAdmin ?? false
}

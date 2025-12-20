'use server'

import { and, count, desc, eq, inArray } from 'drizzle-orm'
import { headers } from 'next/headers'

import { db } from '@/db/client'
import { order } from '@/db/schema/orders'
import { auth } from '@/lib/auth'

interface DeletePreviewResult {
  error?: string
  orderCount?: number
  sampleOrderNumbers?: string[]
}

interface DeleteResult {
  deletedCount?: number
  error?: string
  success?: string
}

export async function deleteSettlementOrders(orderIds: number[]): Promise<DeleteResult> {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return { error: '권한이 없어요.' }
  }

  if (orderIds.length === 0) {
    return { error: '삭제할 주문을 선택해 주세요.' }
  }

  const ids = Array.from(new Set(orderIds))

  try {
    const rows = await db
      .delete(order)
      .where(and(eq(order.status, 'completed'), inArray(order.id, ids)))
      .returning({ id: order.id })

    return { success: `주문 ${rows.length}건을 삭제했어요.`, deletedCount: rows.length }
  } catch (error) {
    console.error('deleteSettlementOrders:', error)
    return { error: '삭제에 실패했어요. 다시 시도해 주세요.' }
  }
}

export async function getSettlementOrderDeletePreview(orderIds: number[]): Promise<DeletePreviewResult> {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return { error: '권한이 없어요.' }
  }

  if (orderIds.length === 0) {
    return { error: '삭제할 주문을 선택해 주세요.' }
  }

  const ids = Array.from(new Set(orderIds))

  try {
    const [countRow] = await db
      .select({ count: count() })
      .from(order)
      .where(and(eq(order.status, 'completed'), inArray(order.id, ids)))

    const sampleRows = await db
      .select({ sabangnetOrderNumber: order.sabangnetOrderNumber })
      .from(order)
      .where(and(eq(order.status, 'completed'), inArray(order.id, ids)))
      .orderBy(desc(order.createdAt), desc(order.id))
      .limit(5)

    return {
      orderCount: countRow?.count ?? 0,
      sampleOrderNumbers: sampleRows.map((r) => r.sabangnetOrderNumber),
    }
  } catch (error) {
    console.error('getSettlementOrderDeletePreview:', error)
    return { error: '삭제 미리보기에 실패했어요.' }
  }
}

async function checkAdminRole(): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() })
  return Boolean(session?.user?.isAdmin)
}

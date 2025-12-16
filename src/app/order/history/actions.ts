'use server'

import { count, inArray } from 'drizzle-orm'
import { headers } from 'next/headers'

import { db } from '@/db/client'
import { orderEmailLog, orderEmailLogItem } from '@/db/schema/orders'
import { auth } from '@/lib/auth'

interface DeletePreviewResult {
  error?: string
  logItemCount?: number
}

interface DeleteResult {
  deletedCount?: number
  error?: string
  success?: string
}

export async function deleteSendLogs(logIds: number[]): Promise<DeleteResult> {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return { error: '권한이 없어요.' }
  }

  if (logIds.length === 0) {
    return { error: '삭제할 항목을 선택해 주세요.' }
  }

  try {
    const deletedCount = await db.transaction(async (tx) => {
      await tx.delete(orderEmailLogItem).where(inArray(orderEmailLogItem.emailLogId, logIds))
      const rows = await tx
        .delete(orderEmailLog)
        .where(inArray(orderEmailLog.id, logIds))
        .returning({ id: orderEmailLog.id })
      return rows.length
    })

    return { success: `발송 기록 ${deletedCount}건을 삭제했어요.`, deletedCount }
  } catch (error) {
    console.error('deleteSendLogs:', error)
    return { error: '삭제에 실패했어요. 다시 시도해 주세요.' }
  }
}

export async function getDeletePreview(logIds: number[]): Promise<DeletePreviewResult> {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return { error: '권한이 없어요.' }
  }

  if (logIds.length === 0) {
    return { error: '삭제할 항목을 선택해 주세요.' }
  }

  try {
    const [itemCountRow] = await db
      .select({ count: count() })
      .from(orderEmailLogItem)
      .where(inArray(orderEmailLogItem.emailLogId, logIds))

    return { logItemCount: itemCountRow?.count ?? 0 }
  } catch (error) {
    console.error('getDeletePreview(order logs):', error)
    return { error: '삭제 미리보기에 실패했어요.' }
  }
}

async function checkAdminRole(): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() })
  return Boolean(session?.user?.isAdmin)
}

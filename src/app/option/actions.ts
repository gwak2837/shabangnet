'use server'

import { and, count, inArray, sql } from 'drizzle-orm'
import { headers } from 'next/headers'

import { db } from '@/db/client'
import { optionMapping } from '@/db/schema/manufacturers'
import { order } from '@/db/schema/orders'
import { auth } from '@/lib/auth'

interface DeletePreviewResult {
  affectedOrdersCount?: number
  error?: string
  mappingCount?: number
}

interface DeleteResult {
  deletedCount?: number
  error?: string
  success?: string
}

export async function deleteOptionMappings(mappingIds: number[]): Promise<DeleteResult> {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return { error: '권한이 없어요.' }
  }

  if (mappingIds.length === 0) {
    return { error: '삭제할 옵션 연결을 선택해 주세요.' }
  }

  const ids = Array.from(new Set(mappingIds))

  try {
    // 정책: 옵션 연결은 "업로드 시점"에만 적용해요.
    // 삭제해도 기존 주문 데이터는 변경하지 않아요. (앞으로 업로드되는 주문부터 반영돼요)
    const deleted = await db
      .delete(optionMapping)
      .where(inArray(optionMapping.id, ids))
      .returning({ id: optionMapping.id })
    return { success: `옵션 연결 ${deleted.length}건을 삭제했어요.`, deletedCount: deleted.length }
  } catch (error) {
    console.error('deleteOptionMappings:', error)
    return { error: '삭제에 실패했어요. 다시 시도해 주세요.' }
  }
}

export async function getOptionMappingDeletePreview(mappingIds: number[]): Promise<DeletePreviewResult> {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return { error: '권한이 없어요.' }
  }

  if (mappingIds.length === 0) {
    return { error: '삭제할 옵션 연결을 선택해 주세요.' }
  }

  const ids = Array.from(new Set(mappingIds))

  try {
    const [[mappingCountRow], [affectedOrdersRow]] = await Promise.all([
      db.select({ count: count() }).from(optionMapping).where(inArray(optionMapping.id, ids)),
      db
        .select({ count: count() })
        .from(order)
        .innerJoin(optionMapping, inArray(optionMapping.id, ids))
        .where(
          and(
            sql`lower(${order.productCode}) = lower(${optionMapping.productCode})`,
            sql`lower(${order.optionName}) = lower(${optionMapping.optionName})`,
            sql`${order.status} <> 'completed'`,
          ),
        ),
    ])

    return {
      mappingCount: mappingCountRow?.count ?? 0,
      affectedOrdersCount: affectedOrdersRow?.count ?? 0,
    }
  } catch (error) {
    console.error('getOptionMappingDeletePreview:', error)
    return { error: '삭제 미리보기에 실패했어요.' }
  }
}

async function checkAdminRole(): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() })
  return Boolean(session?.user?.isAdmin)
}

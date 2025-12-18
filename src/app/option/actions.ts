'use server'

import { and, count, inArray, sql } from 'drizzle-orm'
import { headers } from 'next/headers'

import { db } from '@/db/client'
import { manufacturer, optionMapping, product } from '@/db/schema/manufacturers'
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
    const result = await db.transaction(async (tx) => {
      // 1) 삭제 대상 옵션 연결을 참조하던 "미완료 주문"은 상품 연결(상품코드 기준)로 되돌려요.
      //    - 상품 연결이 없으면 manufacturerId/name이 null로 돌아가요.
      // NOTE: optionMapping을 FROM에 두고, order와 product를 함께 참조해 영향 범위를 좁혀요.
      await tx.execute(sql`
        UPDATE ${order}
        SET
          ${order.manufacturerId} = ${product.manufacturerId},
          ${order.manufacturerName} = ${manufacturer.name}
        FROM ${optionMapping}
        LEFT JOIN ${product} ON lower(${product.productCode}) = lower(${order.productCode})
        LEFT JOIN ${manufacturer} ON ${manufacturer.id} = ${product.manufacturerId}
        WHERE
          ${optionMapping.id} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})
          AND lower(${order.productCode}) = lower(${optionMapping.productCode})
          AND lower(${order.optionName}) = lower(${optionMapping.optionName})
          AND ${order.status} <> 'completed'
      `)

      // 2) 옵션 연결 삭제
      const deleted = await tx.delete(optionMapping).where(inArray(optionMapping.id, ids)).returning({ id: optionMapping.id })
      return deleted.length
    })

    return { success: `옵션 연결 ${result}건을 삭제했어요.`, deletedCount: result }
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



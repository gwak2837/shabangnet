'use server'

import { count, inArray } from 'drizzle-orm'
import { headers } from 'next/headers'

import { db } from '@/db/client'
import { invoiceTemplate, manufacturer, optionMapping, orderTemplate, product } from '@/db/schema/manufacturers'
import { order, orderEmailLog, orderEmailLogItem } from '@/db/schema/orders'
import { auth } from '@/lib/auth'

interface DeletePreviewResult {
  emailLogCount?: number
  emailLogItemCount?: number
  error?: string
  invoiceTemplateCount?: number
  manufacturerCount?: number
  optionMappingCount?: number
  orderCount?: number
  orderTemplateCount?: number
  productCount?: number
}

interface DeleteResult {
  deletedManufacturerCount?: number
  error?: string
  success?: string
}

export async function deleteManufacturers(manufacturerIds: number[]): Promise<DeleteResult> {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return { error: '권한이 없어요.' }
  }

  if (manufacturerIds.length === 0) {
    return { error: '삭제할 제조사를 선택해 주세요.' }
  }

  const ids = Array.from(new Set(manufacturerIds))

  try {
    // 연관 데이터는 FK 정책으로 처리돼요.
    // - 상품/주문/발송 기록: 제조사 연결만 해제돼요 (set null)
    // - 옵션 연결/템플릿: 제조사 삭제와 함께 정리돼요 (cascade)
    const deleted = await db
      .delete(manufacturer)
      .where(inArray(manufacturer.id, ids))
      .returning({ id: manufacturer.id })

    return {
      success: `제조사 ${deleted.length}곳을 삭제했어요. 연결된 상품/주문/발송 기록은 유지돼요.`,
      deletedManufacturerCount: deleted.length,
    }
  } catch (error) {
    console.error('deleteManufacturers:', error)
    return { error: '삭제에 실패했어요. 다시 시도해 주세요.' }
  }
}

export async function getManufacturerDeletePreview(manufacturerIds: number[]): Promise<DeletePreviewResult> {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return { error: '권한이 없어요.' }
  }

  if (manufacturerIds.length === 0) {
    return { error: '삭제할 제조사를 선택해 주세요.' }
  }

  const ids = Array.from(new Set(manufacturerIds))

  try {
    const [
      [manufacturerCountRow],
      [productCountRow],
      [optionMappingCountRow],
      [orderTemplateCountRow],
      [invoiceTemplateCountRow],
      [orderCountRow],
      [emailLogCountRow],
      emailLogIdRows,
    ] = await Promise.all([
      db.select({ count: count() }).from(manufacturer).where(inArray(manufacturer.id, ids)),
      db.select({ count: count() }).from(product).where(inArray(product.manufacturerId, ids)),
      db.select({ count: count() }).from(optionMapping).where(inArray(optionMapping.manufacturerId, ids)),
      db.select({ count: count() }).from(orderTemplate).where(inArray(orderTemplate.manufacturerId, ids)),
      db.select({ count: count() }).from(invoiceTemplate).where(inArray(invoiceTemplate.manufacturerId, ids)),
      db.select({ count: count() }).from(order).where(inArray(order.manufacturerId, ids)),
      db.select({ count: count() }).from(orderEmailLog).where(inArray(orderEmailLog.manufacturerId, ids)),
      db.select({ id: orderEmailLog.id }).from(orderEmailLog).where(inArray(orderEmailLog.manufacturerId, ids)),
    ])

    const emailLogIds = emailLogIdRows.map((r) => r.id)

    const [emailLogItemCountRow] =
      emailLogIds.length > 0
        ? await db.select({ count: count() }).from(orderEmailLogItem).where(inArray(orderEmailLogItem.emailLogId, emailLogIds))
        : [{ count: 0 }]

    return {
      manufacturerCount: manufacturerCountRow?.count ?? 0,
      productCount: productCountRow?.count ?? 0,
      optionMappingCount: optionMappingCountRow?.count ?? 0,
      orderTemplateCount: orderTemplateCountRow?.count ?? 0,
      invoiceTemplateCount: invoiceTemplateCountRow?.count ?? 0,
      orderCount: orderCountRow?.count ?? 0,
      emailLogCount: emailLogCountRow?.count ?? 0,
      emailLogItemCount: emailLogItemCountRow?.count ?? 0,
    }
  } catch (error) {
    console.error('getManufacturerDeletePreview:', error)
    return { error: '삭제 미리보기에 실패했어요.' }
  }
}

async function checkAdminRole(): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() })
  return Boolean(session?.user?.isAdmin)
}



'use server'

import { and, eq, isNull, sql } from 'drizzle-orm'
import { headers } from 'next/headers'

import { db } from '@/db/client'
import { manufacturer, product } from '@/db/schema/manufacturers'
import { order } from '@/db/schema/orders'
import { auth } from '@/lib/auth'

export interface SaveProductManufacturerLinkInput {
  manufacturerId: number | null
  productCode: string
  productName?: string
}

export interface SaveProductManufacturerLinkResult {
  error?: string
  mode?: 'link' | 'unlink'
  success: boolean
  updatedOrders?: number
}

/**
 * 상품코드 → 제조사 연결을 저장하고, 필요하면 기존 주문에도 자동 반영합니다.
 *
 * - manufacturerId가 null이면: product.manufacturerId만 해제(주문 backfill 없음)
 * - manufacturerId가 있으면: product upsert + 주문 backfill(미매칭 주문만)
 */
export async function saveProductManufacturerLink(
  input: SaveProductManufacturerLinkInput,
): Promise<SaveProductManufacturerLinkResult> {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    return { success: false, error: '로그인이 필요해요' }
  }

  const productCode = input.productCode.trim()
  if (!productCode) {
    return { success: false, error: '상품코드를 확인해 주세요.' }
  }

  // 연결 해제: 상품 테이블만 업데이트 (주문은 건드리지 않음)
  if (!input.manufacturerId) {
    try {
      await db
        .update(product)
        .set({ manufacturerId: null, updatedAt: new Date() })
        .where(eq(product.productCode, productCode))
      return { success: true, mode: 'unlink' }
    } catch (error) {
      console.error('saveProductManufacturerLink (unlink)', error)
      return { success: false, error: error instanceof Error ? error.message : '연결을 해제하지 못했어요' }
    }
  }

  const mfr = await db.query.manufacturer.findFirst({
    where: eq(manufacturer.id, input.manufacturerId),
    columns: { id: true, name: true },
  })

  if (!mfr) {
    return { success: false, error: '제조사를 찾을 수 없어요.' }
  }

  try {
    const updatedOrders = await db.transaction(async (tx) => {
      const existingProduct = await tx.query.product.findFirst({
        where: eq(product.productCode, productCode),
        columns: { id: true },
      })

      if (existingProduct) {
        await tx
          .update(product)
          .set({ manufacturerId: mfr.id, updatedAt: new Date() })
          .where(eq(product.productCode, productCode))
      } else {
        const [sample] = await tx
          .select({ productName: order.productName, optionName: order.optionName })
          .from(order)
          .where(eq(order.productCode, productCode))
          .limit(1)

        const productName = input.productName?.trim() || sample?.productName || productCode

        await tx.insert(product).values({
          productCode,
          productName,
          optionName: sample?.optionName || null,
          manufacturerId: mfr.id,
        })
      }

      const updated = await tx
        .update(order)
        .set({
          manufacturerId: mfr.id,
          manufacturerName: mfr.name,
        })
        .where(
          and(
            isNull(order.manufacturerId),
            isNull(order.excludedReason),
            sql`lower(trim(${order.productCode})) = lower(trim(${productCode}))`,
            sql`${order.status} <> 'completed'`,
          ),
        )
        .returning({ id: order.id })

      return updated.length
    })

    return { success: true, mode: 'link', updatedOrders }
  } catch (error) {
    console.error('saveProductManufacturerLink (link)', error)
    return { success: false, error: error instanceof Error ? error.message : '연결을 저장하지 못했어요' }
  }
}

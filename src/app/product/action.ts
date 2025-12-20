'use server'

import { and, count, eq, inArray, isNull, not, sql } from 'drizzle-orm'
import { headers } from 'next/headers'

import { db } from '@/db/client'
import { manufacturer, product } from '@/db/schema/manufacturers'
import { order } from '@/db/schema/orders'
import { auth } from '@/lib/auth'
import { Product } from '@/services/products'

interface DeletePreviewResult {
  error?: string
  productCount?: number
}

interface DeleteResult {
  deletedCount?: number
  error?: string
  success?: string
}

export async function deleteProducts(productIds: number[]): Promise<DeleteResult> {
  const isAdmin = await checkAdminRole()

  if (!isAdmin) {
    return { error: '권한이 없어요.' }
  }

  if (productIds.length === 0) {
    return { error: '삭제할 상품을 선택해 주세요.' }
  }

  const ids = Array.from(new Set(productIds))

  try {
    const rows = await db.delete(product).where(inArray(product.id, ids)).returning({ id: product.id })
    return { success: `상품 ${rows.length}개를 삭제했어요.`, deletedCount: rows.length }
  } catch (error) {
    console.error('deleteProducts:', error)
    return { error: '삭제에 실패했어요. 다시 시도해 주세요.' }
  }
}

export async function getProductDeletePreview(productIds: number[]): Promise<DeletePreviewResult> {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return { error: '권한이 없어요.' }
  }

  if (productIds.length === 0) {
    return { error: '삭제할 상품을 선택해 주세요.' }
  }

  const ids = Array.from(new Set(productIds))

  try {
    const [row] = await db.select({ count: count() }).from(product).where(inArray(product.id, ids))
    return { productCount: row?.count ?? 0 }
  } catch (error) {
    console.error('getProductDeletePreview:', error)
    return { error: '삭제 미리보기에 실패했어요.' }
  }
}

export async function updateProductAction({ id, data }: { id: number; data: Partial<Product> }) {
  const [updated] = await db
    .update(product)
    .set({
      productCode: data.productCode,
      productName: data.productName,
      optionName: data.optionName,
      manufacturerId: data.manufacturerId,
      price: data.price,
      cost: data.cost,
      shippingFee: data.shippingFee,
      updatedAt: new Date(),
    })
    .where(eq(product.id, id))
    .returning()

  if (!updated) {
    throw new Error('Product not found')
  }

  const mfr = updated.manufacturerId
    ? await db.query.manufacturer.findFirst({
        where: eq(manufacturer.id, updated.manufacturerId),
      })
    : null

  // 기존 주문 중 제조사 미연결 건에 자동 반영
  if (updated.manufacturerId) {
    await db
      .update(order)
      .set({
        manufacturerId: updated.manufacturerId,
        manufacturerName: mfr?.name ?? null,
      })
      .where(
        and(
          isNull(order.manufacturerId),
          sql`lower(trim(${order.productCode})) = lower(trim(${updated.productCode}))`,
          not(eq(order.status, 'completed')),
        ),
      )
  }

  return mapToProduct({ ...updated, manufacturer: mfr })
}

async function checkAdminRole(): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() })
  return Boolean(session?.user?.isAdmin)
}

function mapToProduct(
  p: typeof product.$inferSelect & {
    manufacturer?: typeof manufacturer.$inferSelect | null
  },
): Product {
  return {
    id: p.id,
    productCode: p.productCode,
    productName: p.productName,
    optionName: p.optionName || '',
    manufacturerId: p.manufacturerId,
    manufacturerName: p.manufacturer?.name || null,
    price: p.price ?? 0,
    cost: p.cost ?? 0,
    shippingFee: p.shippingFee ?? 0,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }
}

'use server'

import { count, inArray } from 'drizzle-orm'
import { headers } from 'next/headers'

import { db } from '@/db/client'
import { product } from '@/db/schema/manufacturers'
import { auth } from '@/lib/auth'

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

async function checkAdminRole(): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() })
  return Boolean(session?.user?.isAdmin)
}


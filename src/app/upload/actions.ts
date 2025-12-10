'use server'

import { count, inArray } from 'drizzle-orm'
import { headers } from 'next/headers'

import { db } from '@/db/client'
import { order, upload } from '@/db/schema/orders'
import { auth } from '@/lib/auth'

// ============================================
// Types
// ============================================

interface DeletePreviewResult {
  error?: string
  orderCount?: number
  uploadCount?: number
}

interface DeleteResult {
  deletedCount?: number
  error?: string
  success?: string
}

// ============================================
// Helper Functions
// ============================================

/**
 * 업로드 기록 삭제
 * CASCADE DELETE로 연관된 주문도 함께 삭제됨
 */
export async function deleteUploads(uploadIds: number[]): Promise<DeleteResult> {
  const isAdmin = await checkAdminRole()

  if (!isAdmin) {
    return { error: '권한이 없어요.' }
  }

  if (uploadIds.length === 0) {
    return { error: '삭제할 항목을 선택해주세요.' }
  }

  try {
    const result = await db.delete(upload).where(inArray(upload.id, uploadIds)).returning({ id: upload.id })

    return {
      success: `${result.length}개의 업로드 기록을 삭제했어요.`,
      deletedCount: result.length,
    }
  } catch (error) {
    console.error('Failed to delete uploads:', error)
    return { error: '삭제에 실패했어요. 다시 시도해주세요.' }
  }
}

// ============================================
// Actions
// ============================================

/**
 * 삭제 전 영향 범위 미리보기
 * - 선택된 업로드 수
 * - 함께 삭제될 주문 수
 */
export async function getDeletePreview(uploadIds: number[]): Promise<DeletePreviewResult> {
  const isAdmin = await checkAdminRole()

  if (!isAdmin) {
    return { error: '권한이 없어요.' }
  }

  if (uploadIds.length === 0) {
    return { error: '삭제할 항목을 선택해주세요.' }
  }

  try {
    // 연관된 주문 수 조회
    const [orderCountResult] = await db.select({ count: count() }).from(order).where(inArray(order.uploadId, uploadIds))

    return {
      uploadCount: uploadIds.length,
      orderCount: orderCountResult?.count ?? 0,
    }
  } catch (error) {
    console.error('Failed to get delete preview:', error)
    return { error: '삭제 미리보기에 실패했어요.' }
  }
}

async function checkAdminRole(): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    return false
  }

  return session.user.isAdmin
}

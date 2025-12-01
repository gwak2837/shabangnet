import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { db } from '@/db/client'
import { shoppingMallTemplates } from '@/db/schema/settings'

interface RouteParams {
  params: Promise<{ id: string }>
}

// 쇼핑몰 템플릿 삭제
export async function DELETE(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params

    const [deleted] = await db.delete(shoppingMallTemplates).where(eq(shoppingMallTemplates.id, id)).returning()

    if (!deleted) {
      return NextResponse.json({ error: '템플릿을 찾을 수 없습니다' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting shopping mall template:', error)
    return NextResponse.json({ error: '템플릿 삭제에 실패했습니다' }, { status: 500 })
  }
}

// 쇼핑몰 템플릿 상세 조회
export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params

    const [template] = await db.select().from(shoppingMallTemplates).where(eq(shoppingMallTemplates.id, id)).limit(1)

    if (!template) {
      return NextResponse.json({ error: '템플릿을 찾을 수 없습니다' }, { status: 404 })
    }

    return NextResponse.json({
      template: {
        ...template,
        columnMappings: template.columnMappings ? JSON.parse(template.columnMappings) : {},
      },
    })
  } catch (error) {
    console.error('Error fetching shopping mall template:', error)
    return NextResponse.json({ error: '템플릿 조회에 실패했습니다' }, { status: 500 })
  }
}

// 쇼핑몰 템플릿 수정
export async function PUT(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params
    const body = await request.json()
    const { mallName, displayName, columnMappings, headerRow, dataStartRow, enabled } = body

    // 기존 템플릿 확인
    const [existing] = await db.select().from(shoppingMallTemplates).where(eq(shoppingMallTemplates.id, id)).limit(1)

    if (!existing) {
      return NextResponse.json({ error: '템플릿을 찾을 수 없습니다' }, { status: 404 })
    }

    // mallName 중복 체크 (다른 ID에서 같은 mallName 사용하는지)
    if (mallName && mallName !== existing.mallName) {
      const duplicate = await db
        .select()
        .from(shoppingMallTemplates)
        .where(eq(shoppingMallTemplates.mallName, mallName))
        .limit(1)

      if (duplicate.length > 0) {
        return NextResponse.json({ error: '이미 존재하는 쇼핑몰 ID입니다' }, { status: 400 })
      }
    }

    const [updated] = await db
      .update(shoppingMallTemplates)
      .set({
        ...(mallName !== undefined && { mallName }),
        ...(displayName !== undefined && { displayName }),
        ...(columnMappings !== undefined && { columnMappings: JSON.stringify(columnMappings) }),
        ...(headerRow !== undefined && { headerRow }),
        ...(dataStartRow !== undefined && { dataStartRow }),
        ...(enabled !== undefined && { enabled }),
        updatedAt: new Date(),
      })
      .where(eq(shoppingMallTemplates.id, id))
      .returning()

    return NextResponse.json({
      template: {
        ...updated,
        columnMappings: updated.columnMappings ? JSON.parse(updated.columnMappings) : {},
      },
    })
  } catch (error) {
    console.error('Error updating shopping mall template:', error)
    return NextResponse.json({ error: '템플릿 수정에 실패했습니다' }, { status: 500 })
  }
}

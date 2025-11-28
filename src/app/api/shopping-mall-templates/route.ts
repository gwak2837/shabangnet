import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { db } from '@/db'
import { shoppingMallTemplates } from '@/db/schema'

// 쇼핑몰 템플릿 목록 조회
export async function GET(): Promise<NextResponse> {
  try {
    const templates = await db.select().from(shoppingMallTemplates).orderBy(shoppingMallTemplates.displayName)

    // columnMappings JSON 파싱
    const parsedTemplates = templates.map((t) => ({
      ...t,
      columnMappings: t.columnMappings ? JSON.parse(t.columnMappings) : {},
    }))

    return NextResponse.json({ templates: parsedTemplates })
  } catch (error) {
    console.error('Error fetching shopping mall templates:', error)
    return NextResponse.json({ error: '템플릿 목록을 불러오는데 실패했습니다' }, { status: 500 })
  }
}

// 새 쇼핑몰 템플릿 생성
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { mallName, displayName, columnMappings, headerRow, dataStartRow } = body

    if (!mallName || !displayName) {
      return NextResponse.json({ error: '쇼핑몰 ID와 이름을 입력해주세요' }, { status: 400 })
    }

    // 중복 체크
    const existing = await db
      .select()
      .from(shoppingMallTemplates)
      .where(eq(shoppingMallTemplates.mallName, mallName))
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json({ error: '이미 존재하는 쇼핑몰 ID입니다' }, { status: 400 })
    }

    const id = `mall_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`

    const [newTemplate] = await db
      .insert(shoppingMallTemplates)
      .values({
        id,
        mallName,
        displayName,
        columnMappings: JSON.stringify(columnMappings || {}),
        headerRow: headerRow ?? 1,
        dataStartRow: dataStartRow ?? 2,
        enabled: true,
      })
      .returning()

    return NextResponse.json({
      template: {
        ...newTemplate,
        columnMappings: newTemplate.columnMappings ? JSON.parse(newTemplate.columnMappings) : {},
      },
    })
  } catch (error) {
    console.error('Error creating shopping mall template:', error)
    return NextResponse.json({ error: '템플릿 생성에 실패했습니다' }, { status: 500 })
  }
}


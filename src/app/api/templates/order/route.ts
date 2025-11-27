import { NextResponse } from 'next/server'

// 간단한 ID 생성 함수
function generateId(): string {
  return `tpl_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`
}

// 메모리 저장소 (실제 구현시 DB 사용)
const orderTemplates = new Map<string, OrderTemplateData>()

interface OrderTemplateData {
  id: string
  manufacturerId: string
  manufacturerName: string
  templateFileName?: string
  headerRow: number
  dataStartRow: number
  columnMappings: Record<string, string> // 사방넷 key -> 템플릿 컬럼 (A, B, C...)
  fixedValues?: Record<string, string> // 고정값 (컬럼 -> 값)
  createdAt: string
  updatedAt: string
}

// 템플릿 생성/저장
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json()

    const {
      manufacturerId,
      manufacturerName,
      templateFileName,
      headerRow = 1,
      dataStartRow = 2,
      columnMappings = {},
      fixedValues = {},
    } = body

    if (!manufacturerId) {
      return NextResponse.json({ error: '제조사 ID는 필수입니다' }, { status: 400 })
    }

    if (!manufacturerName) {
      return NextResponse.json({ error: '제조사명은 필수입니다' }, { status: 400 })
    }

    // 기존 템플릿이 있으면 업데이트, 없으면 생성
    const existingTemplate = orderTemplates.get(manufacturerId)
    const now = new Date().toISOString()

    const template: OrderTemplateData = {
      id: existingTemplate?.id || generateId(),
      manufacturerId,
      manufacturerName,
      templateFileName,
      headerRow,
      dataStartRow,
      columnMappings,
      fixedValues,
      createdAt: existingTemplate?.createdAt || now,
      updatedAt: now,
    }

    orderTemplates.set(manufacturerId, template)

    return NextResponse.json({
      success: true,
      template,
    })
  } catch (error) {
    console.error('Template save error:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// 전체 템플릿 목록 조회
export async function GET(): Promise<NextResponse> {
  const templates = Array.from(orderTemplates.values())
  return NextResponse.json({ templates })
}

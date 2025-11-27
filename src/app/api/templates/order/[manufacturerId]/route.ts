import { NextResponse } from 'next/server'

// 메모리 저장소 (실제 구현시 DB 사용)
// 이 저장소는 ../route.ts와 공유되어야 하지만, 데모를 위해 분리된 저장소로 구현
// 실제 구현시 DB를 사용하면 이 문제가 해결됨

interface OrderTemplateData {
  id: string
  manufacturerId: string
  manufacturerName: string
  templateFileName?: string
  headerRow: number
  dataStartRow: number
  columnMappings: Record<string, string>
  fixedValues?: Record<string, string>
  createdAt: string
  updatedAt: string
}

// 기본 템플릿 설정
const defaultTemplate: Omit<
  OrderTemplateData,
  'id' | 'manufacturerId' | 'manufacturerName' | 'createdAt' | 'updatedAt'
> = {
  headerRow: 1,
  dataStartRow: 2,
  columnMappings: {
    recipientName: 'A',
    recipientMobile: 'B',
    address: 'C',
    productName: 'D',
    quantity: 'E',
    memo: 'F',
  },
  fixedValues: {},
}

// 특정 제조사 템플릿 조회
export async function GET(
  request: Request,
  { params }: { params: Promise<{ manufacturerId: string }> },
): Promise<NextResponse> {
  try {
    const { manufacturerId } = await params

    // TODO: DB에서 조회
    // 현재는 기본 템플릿 반환
    const template: OrderTemplateData = {
      id: `template-${manufacturerId}`,
      manufacturerId,
      manufacturerName: '제조사', // 실제 구현시 DB에서 조회
      ...defaultTemplate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Template get error:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// 특정 제조사 템플릿 수정
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ manufacturerId: string }> },
): Promise<NextResponse> {
  try {
    const { manufacturerId } = await params
    const body = await request.json()

    const { manufacturerName, templateFileName, headerRow, dataStartRow, columnMappings, fixedValues } = body

    const now = new Date().toISOString()

    // TODO: DB에서 기존 템플릿 조회 및 업데이트
    const template: OrderTemplateData = {
      id: `template-${manufacturerId}`,
      manufacturerId,
      manufacturerName: manufacturerName || '제조사',
      templateFileName,
      headerRow: headerRow ?? 1,
      dataStartRow: dataStartRow ?? 2,
      columnMappings: columnMappings ?? defaultTemplate.columnMappings,
      fixedValues: fixedValues ?? {},
      createdAt: now, // 실제 구현시 기존 값 유지
      updatedAt: now,
    }

    return NextResponse.json({
      success: true,
      template,
    })
  } catch (error) {
    console.error('Template update error:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// 특정 제조사 템플릿 삭제
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ manufacturerId: string }> },
): Promise<NextResponse> {
  try {
    const { manufacturerId } = await params

    // TODO: DB에서 삭제

    return NextResponse.json({
      success: true,
      message: `제조사 ${manufacturerId}의 템플릿이 삭제되었습니다`,
    })
  } catch (error) {
    console.error('Template delete error:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

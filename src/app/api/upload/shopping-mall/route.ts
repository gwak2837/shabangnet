import { NextResponse } from 'next/server'

import { SHOPPING_MALL_CONFIGS } from '@/lib/constants'
import { groupOrdersByManufacturer, type ParsedOrder, parseShoppingMallFile } from '@/lib/excel'
import { setUploadedOrders } from '@/lib/stores/order-store'

interface ManufacturerBreakdown {
  amount: number
  name: string
  orders: number
}

interface UploadError {
  message: string
  productCode?: string
  productName?: string
  row: number
}

// 업로드 결과 타입
interface UploadResult {
  errorOrders: number
  errors: UploadError[]
  fileName: string
  mallName: string
  manufacturerBreakdown: ManufacturerBreakdown[]
  orders: ParsedOrder[]
  processedOrders: number
  success: boolean
  totalOrders: number
  uploadId: string
}

// 쇼핑몰 목록 조회
export async function GET(): Promise<NextResponse> {
  const malls = SHOPPING_MALL_CONFIGS.map((m) => ({
    id: m.id,
    name: m.mallName,
    displayName: m.displayName,
  }))

  return NextResponse.json({ malls })
}

export async function POST(request: Request): Promise<NextResponse<UploadResult | { error: string }>> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const mallId = formData.get('mallId') as string | null

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })
    }

    if (!mallId) {
      return NextResponse.json({ error: '쇼핑몰을 선택해주세요' }, { status: 400 })
    }

    // 쇼핑몰 설정 찾기
    const mallConfig = SHOPPING_MALL_CONFIGS.find((m) => m.id === mallId)
    if (!mallConfig) {
      return NextResponse.json({ error: '알 수 없는 쇼핑몰입니다' }, { status: 400 })
    }

    // 파일 유효성 검사
    const validExtensions = ['.xlsx', '.xls']
    const fileName = file.name
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()

    if (!validExtensions.includes(ext)) {
      return NextResponse.json({ error: '엑셀 파일(.xlsx, .xls)만 업로드 가능합니다' }, { status: 400 })
    }

    // 파일 읽기
    const buffer = await file.arrayBuffer()

    // 파싱
    const parseResult = await parseShoppingMallFile(buffer, mallConfig)

    // 업로드 ID 생성
    const uploadId = generateId()

    // 제조사별 그룹화 (쇼핑몰 파일은 제조사가 없을 수 있음)
    const groupedOrders = groupOrdersByManufacturer(parseResult.orders)

    // 제조사별 통계
    const manufacturerBreakdown: ManufacturerBreakdown[] = []
    groupedOrders.forEach((orders, manufacturer) => {
      const totalAmount = orders.reduce((sum, o) => sum + o.paymentAmount * o.quantity, 0)
      manufacturerBreakdown.push({
        name: manufacturer,
        orders: orders.length,
        amount: totalAmount,
      })
    })

    // 정렬 (주문 수 기준 내림차순)
    manufacturerBreakdown.sort((a, b) => b.orders - a.orders)

    // 에러 변환
    const errors: UploadError[] = parseResult.errors.map((err) => ({
      row: err.row,
      message: err.message,
      productCode: err.data?.productCode as string | undefined,
      productName: err.data?.productName as string | undefined,
    }))

    // 메모리 저장소에 저장 (실제 구현 시 DB에 저장)
    setUploadedOrders(parseResult.orders)

    const result: UploadResult = {
      success: true,
      uploadId,
      fileName: file.name,
      mallName: mallConfig.displayName,
      totalOrders: parseResult.totalRows - mallConfig.headerRow,
      processedOrders: parseResult.orders.length,
      errorOrders: parseResult.errors.length,
      manufacturerBreakdown,
      errors,
      orders: parseResult.orders,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Upload error:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// 간단한 ID 생성 함수
function generateId(): string {
  return `upl_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`
}

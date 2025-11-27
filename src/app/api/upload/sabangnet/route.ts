import { NextResponse } from 'next/server'
import { parseSabangnetFile, groupOrdersByManufacturer, type ParsedOrder } from '@/lib/excel'
import { setUploadedOrders } from '@/lib/stores/order-store'

// 간단한 ID 생성 함수
function generateId(): string {
  return `upl_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`
}

// 업로드 결과 타입
interface UploadResult {
  success: boolean
  uploadId: string
  fileName: string
  totalOrders: number
  processedOrders: number
  errorOrders: number
  manufacturerBreakdown: ManufacturerBreakdown[]
  errors: UploadError[]
  orders: ParsedOrder[]
}

interface ManufacturerBreakdown {
  name: string
  orders: number
  amount: number
}

interface UploadError {
  row: number
  message: string
  productCode?: string
  productName?: string
}

export async function POST(request: Request): Promise<NextResponse<UploadResult | { error: string }>> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })
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
    const parseResult = await parseSabangnetFile(buffer)

    // 업로드 ID 생성
    const uploadId = generateId()

    // 제조사별 그룹화
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
      totalOrders: parseResult.totalRows - 1, // 헤더 제외
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

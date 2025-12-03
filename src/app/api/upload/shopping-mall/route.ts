import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { db } from '@/db/client'
import { manufacturers, optionMappings, products } from '@/db/schema/manufacturers'
import { orders, uploads } from '@/db/schema/orders'
import { shoppingMallTemplates } from '@/db/schema/settings'
import { groupOrdersByManufacturer, type ParsedOrder, parseShoppingMallFile } from '@/lib/excel'

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
  duplicateOrders: number
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
  const templates = await db
    .select({
      id: shoppingMallTemplates.id,
      name: shoppingMallTemplates.mallName,
      displayName: shoppingMallTemplates.displayName,
    })
    .from(shoppingMallTemplates)
    .where(eq(shoppingMallTemplates.enabled, true))
    .orderBy(shoppingMallTemplates.displayName)

  return NextResponse.json({ malls: templates })
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

    // DB에서 쇼핑몰 템플릿 조회
    const dbTemplate = await db.query.shoppingMallTemplates.findFirst({
      where: eq(shoppingMallTemplates.id, mallId),
    })

    if (!dbTemplate) {
      return NextResponse.json({ error: '알 수 없는 쇼핑몰입니다' }, { status: 400 })
    }

    const mallConfig = {
      id: dbTemplate.id,
      mallName: dbTemplate.mallName,
      displayName: dbTemplate.displayName,
      headerRow: dbTemplate.headerRow ?? 1,
      dataStartRow: dbTemplate.dataStartRow ?? 2,
      columnMappings:
        typeof dbTemplate.columnMappings === 'string'
          ? (JSON.parse(dbTemplate.columnMappings) as Record<string, string>)
          : ((dbTemplate.columnMappings as Record<string, string> | null) ?? {}),
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

    // 제조사 목록 조회
    const allManufacturers = await db.select().from(manufacturers)
    const manufacturerMap = new Map(allManufacturers.map((m) => [m.name.toLowerCase(), m]))

    // 상품-제조사 매핑 조회
    const allProducts = await db.select().from(products)
    const productMap = new Map(allProducts.map((p) => [p.productCode.toLowerCase(), p]))

    // 옵션-제조사 매핑 조회
    const allOptionMappings = await db.select().from(optionMappings)
    const optionMap = new Map(
      allOptionMappings.map((o) => [`${o.productCode.toLowerCase()}_${o.optionName.toLowerCase()}`, o]),
    )

    // 주문 데이터 준비 (제조사 매칭 포함)
    const orderValues = parseResult.orders.map((order) => {
      // 제조사 매칭 로직 (우선순위: 옵션 매핑 > 상품 매핑 > 파일 내 제조사명)
      let matchedManufacturerId: string | null = null

      // 1) 옵션 매핑 확인
      if (order.productCode && order.optionName) {
        const optionKey = `${order.productCode.toLowerCase()}_${order.optionName.toLowerCase()}`
        const optionMapping = optionMap.get(optionKey)
        if (optionMapping) {
          matchedManufacturerId = optionMapping.manufacturerId
        }
      }

      // 2) 상품 매핑 확인 (옵션 매핑이 없는 경우)
      if (!matchedManufacturerId && order.productCode) {
        const product = productMap.get(order.productCode.toLowerCase())
        if (product?.manufacturerId) {
          matchedManufacturerId = product.manufacturerId
        }
      }

      // 3) 파일 내 제조사명으로 매칭
      if (!matchedManufacturerId && order.manufacturer) {
        const manufacturer = manufacturerMap.get(order.manufacturer.toLowerCase())
        if (manufacturer) {
          matchedManufacturerId = manufacturer.id
        }
      }

      return {
        id: generateOrderId(),
        uploadId,
        orderNumber: order.orderNumber,
        productName: order.productName || null,
        quantity: order.quantity || 1,
        orderName: order.orderName || null,
        recipientName: order.recipientName || null,
        orderPhone: order.orderPhone || null,
        orderMobile: order.orderMobile || null,
        recipientPhone: order.recipientPhone || null,
        recipientMobile: order.recipientMobile || null,
        postalCode: order.postalCode || null,
        address: order.address || null,
        memo: order.memo || null,
        shoppingMall: mallConfig.displayName,
        manufacturerName: order.manufacturer || null,
        manufacturerId: matchedManufacturerId,
        courier: order.courier || null,
        trackingNumber: order.trackingNumber || null,
        optionName: order.optionName || null,
        paymentAmount: order.paymentAmount?.toString() || '0',
        productAbbr: order.productAbbr || null,
        productCode: order.productCode || null,
        cost: order.cost?.toString() || '0',
        shippingCost: order.shippingCost?.toString() || '0',
        status: 'pending' as const,
      }
    })

    // DB 트랜잭션으로 저장 (중복 주문번호는 건너뜀)
    let insertedCount = 0
    await db.transaction(async (tx) => {
      // 1. 업로드 레코드 생성
      await tx.insert(uploads).values({
        id: uploadId,
        fileName: file.name,
        fileSize: file.size,
        fileType: 'shopping_mall',
        shoppingMallId: mallId,
        totalOrders: parseResult.totalRows - mallConfig.headerRow,
        processedOrders: parseResult.orders.length,
        errorOrders: parseResult.errors.length,
        status: 'completed',
      })

      // 2. 주문 레코드 일괄 생성 (중복 주문번호는 건너뜀)
      if (orderValues.length > 0) {
        const insertResult = await tx
          .insert(orders)
          .values(orderValues)
          .onConflictDoNothing({ target: orders.orderNumber })
          .returning({ id: orders.id })

        insertedCount = insertResult.length
      }
    })

    // 중복으로 건너뛴 주문 수 계산
    const duplicateCount = orderValues.length - insertedCount

    // 제조사별 그룹화 (쇼핑몰 파일은 제조사가 없을 수 있음)
    const groupedOrders = groupOrdersByManufacturer(parseResult.orders)

    // 제조사별 통계
    const manufacturerBreakdown: ManufacturerBreakdown[] = []
    groupedOrders.forEach((ordersGroup, manufacturer) => {
      const totalAmount = ordersGroup.reduce((sum, o) => sum + o.paymentAmount * o.quantity, 0)
      manufacturerBreakdown.push({
        name: manufacturer,
        orders: ordersGroup.length,
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

    const result: UploadResult = {
      success: true,
      uploadId,
      fileName: file.name,
      mallName: mallConfig.displayName,
      totalOrders: parseResult.totalRows - mallConfig.headerRow,
      processedOrders: insertedCount,
      duplicateOrders: duplicateCount,
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

// 업로드 ID 생성 함수
function generateId(): string {
  return `upl_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`
}

// 주문 ID 생성 함수
function generateOrderId(): string {
  return `ord_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`
}

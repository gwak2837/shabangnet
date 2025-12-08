import { NextResponse } from 'next/server'

import { db } from '@/db/client'
import { manufacturer, optionMapping, product } from '@/db/schema/manufacturers'
import { order, upload } from '@/db/schema/orders'
import { groupOrdersByManufacturer, type ParsedOrder } from '@/lib/excel'

import { parseSabangnetFile } from './excel'

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
  manufacturerBreakdown: ManufacturerBreakdown[]
  orders: ParsedOrder[]
  processedOrders: number
  success: boolean
  totalOrders: number
  uploadId: number
}

export async function POST(request: Request): Promise<NextResponse<UploadResult | { error: string }>> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })
    }

    const validExtensions = ['.xlsx', '.xls']
    const fileName = file.name
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()

    if (!validExtensions.includes(ext)) {
      return NextResponse.json({ error: '엑셀 파일(.xlsx, .xls)만 업로드 가능합니다' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const parseResult = await parseSabangnetFile(buffer)

    const [allManufacturers, allProducts, allOptionMappings] = await Promise.all([
      db
        .select({
          id: manufacturer.id,
          name: manufacturer.name,
        })
        .from(manufacturer),
      db
        .select({
          productCode: product.productCode,
          manufacturerId: product.manufacturerId,
        })
        .from(product),
      db
        .select({
          productCode: optionMapping.productCode,
          optionName: optionMapping.optionName,
          manufacturerId: optionMapping.manufacturerId,
        })
        .from(optionMapping),
    ])

    const manufacturerMap = new Map(allManufacturers.map((m) => [m.name.toLowerCase(), m]))
    const productMap = new Map(allProducts.map((p) => [p.productCode.toLowerCase(), p]))
    const optionMap = new Map(
      allOptionMappings.map((o) => [`${o.productCode.toLowerCase()}_${o.optionName.toLowerCase()}`, o]),
    )

    // 주문 데이터 준비 함수 (uploadId를 나중에 받아서 사용)
    const prepareOrderValues = (uploadId: number) =>
      parseResult.orders.map((o) => {
        // 제조사 매칭 로직 (우선순위: 옵션 매핑 > 상품 매핑 > 파일 내 제조사명)
        let matchedManufacturerId: number | null = null

        // 1) 옵션 매핑 확인
        if (o.productCode && o.optionName) {
          const optionKey = `${o.productCode.toLowerCase()}_${o.optionName.toLowerCase()}`
          const om = optionMap.get(optionKey)
          if (om) {
            matchedManufacturerId = om.manufacturerId
          }
        }

        // 2) 상품 매핑 확인 (옵션 매핑이 없는 경우)
        if (!matchedManufacturerId && o.productCode) {
          const p = productMap.get(o.productCode.toLowerCase())
          if (p?.manufacturerId) {
            matchedManufacturerId = p.manufacturerId
          }
        }

        // 3) 파일 내 제조사명으로 매칭
        if (!matchedManufacturerId && o.manufacturer) {
          const mfr = manufacturerMap.get(o.manufacturer.toLowerCase())
          if (mfr) {
            matchedManufacturerId = mfr.id
          }
        }

        return {
          uploadId,
          orderNumber: o.orderNumber,
          productName: o.productName || null,
          quantity: o.quantity || 1,
          orderName: o.orderName || null,
          recipientName: o.recipientName || null,
          orderPhone: o.orderPhone || null,
          orderMobile: o.orderMobile || null,
          recipientPhone: o.recipientPhone || null,
          recipientMobile: o.recipientMobile || null,
          postalCode: o.postalCode || null,
          address: o.address || null,
          memo: o.memo || null,
          shoppingMall: o.shoppingMall || null,
          manufacturerName: o.manufacturer || null,
          manufacturerId: matchedManufacturerId,
          courier: o.courier || null,
          trackingNumber: o.trackingNumber || null,
          optionName: o.optionName || null,
          paymentAmount: o.paymentAmount || 0,
          productAbbr: o.productAbbr || null,
          productCode: o.productCode || null,
          cost: o.cost || 0,
          shippingCost: o.shippingCost || 0,
          status: 'pending' as const,
        }
      })

    // DB 트랜잭션으로 저장 (중복 주문번호는 건너뜀)
    let insertedCount = 0
    let uploadId = 0
    await db.transaction(async (tx) => {
      // 1. 업로드 레코드 생성
      const [uploadRecord] = await tx
        .insert(upload)
        .values({
          fileName: file.name,
          fileSize: file.size,
          fileType: 'sabangnet',
          totalOrders: parseResult.totalRows - 1,
          processedOrders: parseResult.orders.length,
          errorOrders: parseResult.errors.length,
          status: 'completed',
        })
        .returning()

      uploadId = uploadRecord.id

      // 2. 주문 레코드 일괄 생성 (중복 주문번호는 건너뜀)
      const orderValues = prepareOrderValues(uploadId)
      if (orderValues.length > 0) {
        const insertResult = await tx
          .insert(order)
          .values(orderValues)
          .onConflictDoNothing({ target: order.orderNumber })
          .returning({ id: order.id })

        insertedCount = insertResult.length
      }
    })

    // 중복으로 건너뛴 주문 수 계산
    const duplicateCount = parseResult.orders.length - insertedCount

    // 제조사별 그룹화
    const groupedOrders = groupOrdersByManufacturer(parseResult.orders)

    // 제조사별 통계
    const manufacturerBreakdown: ManufacturerBreakdown[] = []
    groupedOrders.forEach((ordersGroup, mfr) => {
      const totalAmount = ordersGroup.reduce((sum, o) => sum + o.paymentAmount * o.quantity, 0)
      manufacturerBreakdown.push({
        name: mfr,
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
      totalOrders: parseResult.totalRows - 1, // 헤더 제외
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

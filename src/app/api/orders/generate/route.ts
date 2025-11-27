import { NextResponse } from 'next/server'

import {
  generateOrderFileName,
  generateOrderSheet,
  generateTemplateBasedOrderSheet,
  type OrderTemplateConfig,
  type ParsedOrder,
} from '@/lib/excel'

interface GenerateRequest {
  manufacturerId: string
  manufacturerName: string
  orders: ParsedOrder[]
  templateBuffer?: string // base64 encoded
  templateConfig?: OrderTemplateConfig
}

interface GenerateResponse {
  error?: string
  fileBuffer?: string // base64 encoded
  fileName?: string
  orderCount?: number
  success: boolean
  totalAmount?: number
}

export async function POST(request: Request): Promise<NextResponse<GenerateResponse>> {
  try {
    const body: GenerateRequest = await request.json()

    const { manufacturerId, manufacturerName, orders, templateConfig, templateBuffer } = body

    if (!manufacturerId || !manufacturerName) {
      return NextResponse.json({ success: false, error: '제조사 정보가 필요합니다' }, { status: 400 })
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ success: false, error: '발주할 주문이 없습니다' }, { status: 400 })
    }

    const date = new Date()
    let fileBuffer: Buffer

    // 템플릿 설정이 있으면 템플릿 기반 생성
    if (templateConfig && Object.keys(templateConfig.columnMappings).length > 0) {
      let templateArrayBuffer: ArrayBuffer | null = null

      // base64 인코딩된 템플릿 버퍼가 있으면 디코드
      if (templateBuffer) {
        const binaryString = atob(templateBuffer)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        templateArrayBuffer = bytes.buffer
      }

      fileBuffer = await generateTemplateBasedOrderSheet(
        orders,
        templateArrayBuffer,
        templateConfig,
        manufacturerName,
        date,
      )
    } else {
      // 기본 양식으로 생성
      fileBuffer = await generateOrderSheet({
        manufacturerName,
        orders: orders.map((o) => ({
          orderNumber: o.orderNumber,
          customerName: o.recipientName,
          phone: o.recipientMobile || o.recipientPhone,
          address: o.address,
          productCode: o.productCode,
          productName: o.productName,
          optionName: o.optionName,
          quantity: o.quantity,
          price: o.paymentAmount,
          memo: o.memo,
        })),
        date,
      })
    }

    const fileName = generateOrderFileName(manufacturerName, date)
    const totalAmount = orders.reduce((sum, o) => sum + (o.paymentAmount || 0) * o.quantity, 0)

    // Buffer를 base64로 인코딩
    const base64Buffer = fileBuffer.toString('base64')

    return NextResponse.json({
      success: true,
      fileName,
      fileBuffer: base64Buffer,
      orderCount: orders.length,
      totalAmount,
    })
  } catch (error) {
    console.error('Order generation error:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}

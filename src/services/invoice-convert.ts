'use server'

import { eq, inArray } from 'drizzle-orm'

import type { InvoiceTemplate } from '@/services/manufacturers.types'

import { db } from '@/db/client'
import { order } from '@/db/schema/orders'
import { courierMapping } from '@/db/schema/settings'
import {
  generateInvoiceFileName,
  generateSabangnetInvoiceFile,
  type InvoiceConvertResultItem,
  type InvoiceRow,
  parseInvoiceFile,
} from '@/lib/excel'

export type { InvoiceConvertResultItem }

// 변환 요청 파라미터
export interface ConvertInvoiceParams {
  file: ArrayBuffer
  manufacturerId: number
  manufacturerName: string
  template: InvoiceTemplate
}

// 변환 결과
export interface ConvertInvoiceResult {
  downloadBuffer?: Buffer
  errors: string[]
  fileName: string
  results: InvoiceConvertResultItem[]
  success: boolean
}

/**
 * 송장 파일 변환 수행
 * 1. 송장 파일 파싱
 * 2. 택배사 코드 변환
 * 3. 주문 데이터와 매칭
 * 4. 주문 테이블 업데이트 (택배사/송장번호)
 * 5. 사방넷 양식 파일 생성
 */
export async function convertInvoiceFile(params: ConvertInvoiceParams): Promise<ConvertInvoiceResult> {
  const { file, manufacturerId, manufacturerName, template } = params
  const errors: string[] = []

  try {
    // 1. 송장 파일 파싱
    const parseResult = await parseInvoiceFile(file, template)

    if (parseResult.errors.length > 0) {
      errors.push(...parseResult.errors.map((e) => `행 ${e.row}: ${e.message}`))
    }

    if (parseResult.invoices.length === 0) {
      return {
        success: false,
        results: [],
        errors: ['파싱된 송장 데이터가 없습니다'],
        fileName: '',
      }
    }

    // 2. 택배사 매핑 조회
    const courierMappingList = await db.select().from(courierMapping)
    const courierLookup = buildCourierLookup(courierMappingList)

    // 3. 해당 제조사의 주문 데이터 조회 (주문번호로 매칭)
    const orderNumbers = parseResult.invoices.map((inv) => inv.orderNumber)
    const existingOrders = await db
      .select({ id: order.id, orderNumber: order.orderNumber })
      .from(order)
      .where(inArray(order.orderNumber, orderNumbers))

    const orderMap = new Map(existingOrders.map((o) => [o.orderNumber, o.id]))

    // 4. 변환 수행
    const results: InvoiceConvertResultItem[] = []
    const ordersToUpdate: { id: number; courier: string; trackingNumber: string }[] = []

    for (const invoice of parseResult.invoices) {
      const result = convertSingleInvoice(invoice, courierLookup, orderMap)
      results.push(result)

      // 성공한 건만 업데이트 대상에 추가
      if (result.status === 'success') {
        const orderId = orderMap.get(invoice.orderNumber)
        if (orderId) {
          ordersToUpdate.push({
            id: orderId,
            courier: result.courierCode,
            trackingNumber: result.trackingNumber,
          })
        }
      }
    }

    // 5. 주문 테이블 업데이트 (트랜잭션)
    if (ordersToUpdate.length > 0) {
      await db.transaction(async (tx) => {
        for (const update of ordersToUpdate) {
          await tx
            .update(order)
            .set({
              courier: update.courier,
              trackingNumber: update.trackingNumber,
            })
            .where(eq(order.id, update.id))
        }
      })
    }

    // 6. 사방넷 양식 파일 생성
    const successResults = results.filter((r) => r.status === 'success')
    let downloadBuffer: Buffer | undefined

    if (successResults.length > 0) {
      downloadBuffer = await generateSabangnetInvoiceFile(results)
    }

    const fileName = generateInvoiceFileName(manufacturerName)

    return {
      success: true,
      results,
      errors,
      fileName,
      downloadBuffer,
    }
  } catch (error) {
    return {
      success: false,
      results: [],
      errors: [error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'],
      fileName: '',
    }
  }
}

/**
 * 사방넷 송장 업로드 파일 다운로드용 버퍼 생성
 */
export async function generateInvoiceDownload(
  results: InvoiceConvertResultItem[],
  manufacturerName: string,
): Promise<{ buffer: Buffer; fileName: string }> {
  const buffer = await generateSabangnetInvoiceFile(results)
  const fileName = generateInvoiceFileName(manufacturerName)

  return { buffer, fileName }
}

/**
 * 택배사 매핑 룩업 테이블 생성
 * 택배사명/별칭 -> 사방넷 코드
 */
function buildCourierLookup(
  mappings: { aliases: string[] | null; code: string; enabled: boolean | null; name: string }[],
): Map<string, string> {
  const lookup = new Map<string, string>()

  for (const mapping of mappings) {
    if (!mapping.enabled) continue

    // 정확한 이름 매칭
    lookup.set(mapping.name.toLowerCase(), mapping.code)

    // 별칭 매칭
    if (mapping.aliases) {
      for (const alias of mapping.aliases) {
        lookup.set(alias.toLowerCase(), mapping.code)
      }
    }
  }

  return lookup
}

/**
 * 단일 송장 건 변환
 */
function convertSingleInvoice(
  invoice: InvoiceRow,
  courierLookup: Map<string, string>,
  orderMap: Map<string, number>,
): InvoiceConvertResultItem {
  // 주문번호 존재 여부 확인
  if (!orderMap.has(invoice.orderNumber)) {
    return {
      orderNumber: invoice.orderNumber,
      courierCode: '',
      trackingNumber: invoice.trackingNumber,
      status: 'order_not_found',
      errorMessage: '주문번호를 찾을 수 없습니다',
    }
  }

  // 택배사 코드 변환
  const normalizedCourier = invoice.courierName.toLowerCase().trim()
  const courierCode = courierLookup.get(normalizedCourier)

  if (!courierCode) {
    return {
      orderNumber: invoice.orderNumber,
      courierCode: '',
      trackingNumber: invoice.trackingNumber,
      status: 'courier_error',
      originalCourier: invoice.courierName,
    }
  }

  return {
    orderNumber: invoice.orderNumber,
    courierCode,
    trackingNumber: invoice.trackingNumber,
    status: 'success',
  }
}

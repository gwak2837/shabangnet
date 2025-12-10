import type { ParsedOrder } from '@/lib/excel'

export interface ExclusionPattern {
  description: string | null
  enabled: boolean | null
  pattern: string
}

export interface LookupMaps {
  manufacturerMap: Map<string, ManufacturerInfo>
  optionMap: Map<string, OptionMappingInfo>
  productMap: Map<string, ProductInfo>
}

export interface ManufacturerBreakdown {
  amount: number
  marginRate: number | null
  name: string
  orders: number
  productCount: number
  totalCost: number
  totalQuantity: number
}

export interface UploadError {
  message: string
  productCode?: string
  productName?: string
  row: number
}

export interface UploadResult {
  duplicateOrders: number
  errorOrders: number
  errors: UploadError[]
  manufacturerBreakdown: ManufacturerBreakdown[]
  orderNumbers: string[]
  processedOrders: number
  summary: {
    estimatedMargin: number | null
    totalAmount: number
    totalCost: number
  }
}

interface ManufacturerInfo {
  id: number
  name: string
}

interface OptionMappingInfo {
  manufacturerId: number
  optionName: string
  productCode: string
}

interface PrepareOrderParams {
  checkExclusionPattern: (fulfillmentType: string) => string | null
  lookupMaps: LookupMaps
  orders: ParsedOrder[]
  uploadId: number
}

interface ProductInfo {
  manufacturerId: number | null
  productCode: string
}

export function buildLookupMaps(
  manufacturers: ManufacturerInfo[],
  products: ProductInfo[],
  optionMappings: OptionMappingInfo[],
): LookupMaps {
  return {
    manufacturerMap: new Map(manufacturers.map((m) => [m.name.toLowerCase(), m])),
    productMap: new Map(products.map((p) => [p.productCode.toLowerCase(), p])),
    optionMap: new Map(optionMappings.map((o) => [`${o.productCode.toLowerCase()}_${o.optionName.toLowerCase()}`, o])),
  }
}

export function calculateManufacturerBreakdown(groupedOrders: Map<string, ParsedOrder[]>): ManufacturerBreakdown[] {
  const breakdown: ManufacturerBreakdown[] = []

  groupedOrders.forEach((ordersGroup, mfr) => {
    const totalAmount = ordersGroup.reduce((sum, o) => sum + o.paymentAmount * o.quantity, 0)
    const totalQuantity = ordersGroup.reduce((sum, o) => sum + o.quantity, 0)
    const totalCost = ordersGroup.reduce((sum, o) => sum + o.cost, 0)
    const uniqueProducts = new Set(ordersGroup.map((o) => o.productCode || o.productName).filter(Boolean))
    const marginRate =
      totalCost > 0 && totalAmount > 0 ? Math.round(((totalAmount - totalCost) / totalAmount) * 100) : null

    breakdown.push({
      name: mfr,
      orders: ordersGroup.length,
      amount: totalAmount,
      totalQuantity,
      totalCost,
      productCount: uniqueProducts.size,
      marginRate,
    })
  })

  // 정렬 (주문 수 기준 내림차순)
  breakdown.sort((a, b) => b.orders - a.orders)

  return breakdown
}

export function calculateSummary(breakdown: ManufacturerBreakdown[]) {
  const totalAmount = breakdown.reduce((sum, m) => sum + m.amount, 0)
  const totalCost = breakdown.reduce((sum, m) => sum + m.totalCost, 0)
  const estimatedMargin = totalCost > 0 ? totalAmount - totalCost : null

  return { totalAmount, totalCost, estimatedMargin }
}

export function createExclusionChecker(patterns: ExclusionPattern[]) {
  return function checkExclusionPattern(fulfillmentType: string): string | null {
    if (!fulfillmentType || patterns.length === 0) {
      return null
    }

    const matched = patterns.find((p) => fulfillmentType.includes(p.pattern))
    return matched ? matched.description || matched.pattern : null
  }
}

export function prepareOrderValues({ orders, uploadId, lookupMaps, checkExclusionPattern }: PrepareOrderParams) {
  const { manufacturerMap, productMap, optionMap } = lookupMaps

  return orders.map((o) => {
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

    // 4) 제외 패턴 체크 (T열 주문유형 기준)
    const excludedReason = checkExclusionPattern(o.fulfillmentType)

    return {
      uploadId,
      // 주문 식별자
      sabangnetOrderNumber: o.sabangnetOrderNumber,
      mallOrderNumber: o.mallOrderNumber || null,
      subOrderNumber: o.subOrderNumber || null,
      // 상품 정보
      productName: o.productName || null,
      quantity: o.quantity || 1,
      optionName: o.optionName || null,
      productAbbr: o.productAbbr || null,
      productCode: o.productCode || null,
      mallProductNumber: o.mallProductNumber || null,
      modelNumber: o.modelNumber || null,
      // 주문자/수취인
      orderName: o.orderName || null,
      recipientName: o.recipientName || null,
      orderPhone: o.orderPhone || null,
      orderMobile: o.orderMobile || null,
      recipientPhone: o.recipientPhone || null,
      recipientMobile: o.recipientMobile || null,
      // 배송 정보
      postalCode: o.postalCode || null,
      address: o.address || null,
      memo: o.memo || null,
      courier: o.courier || null,
      trackingNumber: o.trackingNumber || null,
      logisticsNote: o.logisticsNote || null,
      // 소스/제조사
      shoppingMall: o.shoppingMall || null,
      manufacturerName: o.manufacturer || null,
      manufacturerId: matchedManufacturerId,
      // 금액
      paymentAmount: o.paymentAmount || 0,
      cost: o.cost || 0,
      shippingCost: o.shippingCost || 0,
      // 주문 메타
      fulfillmentType: o.fulfillmentType || null,
      cjDate: o.cjDate ? parseDate(o.cjDate) : null,
      collectedAt: o.collectedAt ? parseDateTime(o.collectedAt) : null,
      // 시스템
      status: 'pending' as const,
      excludedReason,
    }
  })
}

/**
 * 날짜 문자열을 Date 객체로 변환 (씨제이날짜용)
 * 예: "2024-12-10", "20241210", "2024.12.10" 등
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null

  // 숫자만 추출
  const digits = dateStr.replace(/\D/g, '')

  // YYYYMMDD 형식
  if (digits.length === 8) {
    const year = parseInt(digits.slice(0, 4), 10)
    const month = parseInt(digits.slice(4, 6), 10) - 1
    const day = parseInt(digits.slice(6, 8), 10)
    const date = new Date(year, month, day)
    return isNaN(date.getTime()) ? null : date
  }

  // 일반 Date 파싱 시도
  const parsed = new Date(dateStr)
  return isNaN(parsed.getTime()) ? null : parsed
}

/**
 * 날짜+시간 문자열을 Date 객체로 변환 (수집일시용)
 * 예: "2024-12-10 14:30:00", "2024.12.10 14:30" 등
 */
function parseDateTime(dateTimeStr: string): Date | null {
  if (!dateTimeStr) return null

  // 일반 Date 파싱 시도
  const parsed = new Date(dateTimeStr)
  if (!isNaN(parsed.getTime())) {
    return parsed
  }

  // 한국 날짜 형식 시도 (YYYY.MM.DD HH:mm:ss 또는 YYYY-MM-DD HH:mm:ss)
  const match = dateTimeStr.match(/(\d{4})[\.\-\/](\d{1,2})[\.\-\/](\d{1,2})\s*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?/)
  if (match) {
    const [, year, month, day, hour = '0', minute = '0', second = '0'] = match
    const date = new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hour, 10),
      parseInt(minute, 10),
      parseInt(second, 10),
    )
    return isNaN(date.getTime()) ? null : date
  }

  return null
}

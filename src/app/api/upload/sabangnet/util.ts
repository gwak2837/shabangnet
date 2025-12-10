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
  fileName: string
  manufacturerBreakdown: ManufacturerBreakdown[]
  orderNumbers: string[]
  processedOrders: number
  success: boolean
  summary: {
    estimatedMargin: number | null
    totalAmount: number
    totalCost: number
  }
  totalOrders: number
  uploadId: number
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

interface ProductInfo {
  manufacturerId: number | null
  productCode: string
}

const VALID_EXTENSIONS = ['.xlsx', '.xls']

interface PrepareOrderParams {
  checkExclusionPattern: (fulfillmentType: string) => string | null
  lookupMaps: LookupMaps
  orders: ParsedOrder[]
  uploadId: number
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

    if (matched) {
      console.log('👀 - checkExclusionPattern - matched:', fulfillmentType, patterns)
    }
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

    if (excludedReason) {
      console.log('👀 - prepareOrderValues - excludedReason:', o.orderNumber, excludedReason)
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
      courier: o.fulfillmentType || o.courier || null,
      trackingNumber: o.trackingNumber || null,
      optionName: o.optionName || null,
      paymentAmount: o.paymentAmount || 0,
      productAbbr: o.productAbbr || null,
      productCode: o.productCode || null,
      cost: o.cost || 0,
      shippingCost: o.shippingCost || 0,
      status: 'pending' as const,
      excludedReason,
    }
  })
}

export function validateExcelFile(file: File) {
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

  if (!VALID_EXTENSIONS.includes(ext)) {
    return { valid: false, error: '.xlsx, .xls 엑셀 파일만 업로드 가능해요' }
  }

  return { valid: true }
}

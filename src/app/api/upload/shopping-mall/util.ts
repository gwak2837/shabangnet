import type { ParsedOrder } from '@/lib/excel'

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
  mallName: string
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
  displayName: string
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

  breakdown.sort((a, b) => b.orders - a.orders)

  return breakdown
}

export function calculateSummary(breakdown: ManufacturerBreakdown[]) {
  const totalAmount = breakdown.reduce((sum, m) => sum + m.amount, 0)
  const totalCost = breakdown.reduce((sum, m) => sum + m.totalCost, 0)
  const estimatedMargin = totalCost > 0 ? totalAmount - totalCost : null

  return { totalAmount, totalCost, estimatedMargin }
}

export function prepareOrderValues({ orders, uploadId, lookupMaps, displayName }: PrepareOrderParams) {
  const { manufacturerMap, productMap, optionMap } = lookupMaps

  return orders.map((o) => {
    let matchedManufacturerId: number | null = null

    // 1) 옵션 매핑 확인
    if (o.productCode && o.optionName) {
      const optionKey = `${o.productCode.toLowerCase()}_${o.optionName.toLowerCase()}`
      const om = optionMap.get(optionKey)
      if (om) {
        matchedManufacturerId = om.manufacturerId
      }
    }

    // 2) 상품 매핑 확인
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
      sabangnetOrderNumber: o.sabangnetOrderNumber,
      mallOrderNumber: o.mallOrderNumber || null,
      subOrderNumber: o.subOrderNumber || null,
      productName: o.productName || null,
      quantity: o.quantity || 1,
      optionName: o.optionName || null,
      productAbbr: o.productAbbr || null,
      productCode: o.productCode || null,
      mallProductNumber: o.mallProductNumber || null,
      modelNumber: o.modelNumber || null,
      orderName: o.orderName || null,
      recipientName: o.recipientName || null,
      orderPhone: o.orderPhone || null,
      orderMobile: o.orderMobile || null,
      recipientPhone: o.recipientPhone || null,
      recipientMobile: o.recipientMobile || null,
      postalCode: o.postalCode || null,
      address: o.address || null,
      memo: o.memo || null,
      courier: o.courier || null,
      trackingNumber: o.trackingNumber || null,
      logisticsNote: o.logisticsNote || null,
      shoppingMall: displayName,
      manufacturerName: o.manufacturer || null,
      manufacturerId: matchedManufacturerId,
      paymentAmount: o.paymentAmount || 0,
      cost: o.cost || 0,
      shippingCost: o.shippingCost || 0,
      fulfillmentType: o.fulfillmentType || null,
      status: 'pending' as const,
    }
  })
}

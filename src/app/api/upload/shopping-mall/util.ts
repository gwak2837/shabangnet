import type { ParsedOrder } from '@/lib/excel'

import type { LookupMaps, ManufacturerBreakdown, UploadError, UploadSummary } from '../type'

import { matchManufacturerId, normalizeManufacturerName } from '../common'

export interface UploadResult {
  autoCreatedManufacturers?: string[]
  duplicateOrders: number
  errorOrders: number
  errors: UploadError[]
  mallName: string
  manufacturerBreakdown: ManufacturerBreakdown[]
  orderNumbers: string[]
  processedOrders: number
  summary: UploadSummary
  uploadId: number
}

interface PrepareOrderParams {
  displayName: string
  lookupMaps: LookupMaps
  orders: ParsedOrder[]
  uploadId: number
}

export function prepareOrderValues({ orders, uploadId, lookupMaps, displayName }: PrepareOrderParams) {
  const manufacturerNameById = new Map<number, string>()

  for (const mfr of lookupMaps.manufacturerMap.values()) {
    manufacturerNameById.set(mfr.id, mfr.name)
  }

  return orders.map((o) => {
    const matchedManufacturerId = matchManufacturerId(o, lookupMaps)
    const rawManufacturerName = typeof o.manufacturer === 'string' ? normalizeManufacturerName(o.manufacturer) : null
    const resolvedManufacturerName =
      matchedManufacturerId != null
        ? (manufacturerNameById.get(matchedManufacturerId) ?? rawManufacturerName)
        : rawManufacturerName

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
      manufacturerName: resolvedManufacturerName,
      manufacturerId: matchedManufacturerId,
      paymentAmount: o.paymentAmount || 0,
      cost: o.cost || 0,
      shippingCost: o.shippingCost || 0,
      fulfillmentType: o.fulfillmentType || null,
      status: 'pending' as const,
    }
  })
}

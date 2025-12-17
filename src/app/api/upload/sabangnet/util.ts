import type { ParsedOrder } from '@/lib/excel'

import type { LookupMaps, ManufacturerBreakdown, UploadError, UploadSummary } from '../type'

import { matchManufacturerId } from '../common'

export interface ExclusionPattern {
  description: string | null
  enabled: boolean | null
  pattern: string
}

export interface UploadResult {
  autoCreatedManufacturers?: string[]
  duplicateOrders: number
  errorOrders: number
  errors: UploadError[]
  manufacturerBreakdown: ManufacturerBreakdown[]
  orderNumbers: string[]
  processedOrders: number
  summary: UploadSummary
}

interface PrepareOrderParams {
  checkExclusionPattern: (fulfillmentType: string) => string | null
  lookupMaps: LookupMaps
  orders: ParsedOrder[]
  uploadId: number
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

export function mapOrderValues({ orders, uploadId, lookupMaps, checkExclusionPattern }: PrepareOrderParams) {
  return orders.map((o) => {
    const matchedManufacturerId = matchManufacturerId(o, lookupMaps)
    const excludedReason = checkExclusionPattern(o.fulfillmentType)

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
      shoppingMall: o.shoppingMall || null,
      manufacturerName: o.manufacturer || null,
      manufacturerId: matchedManufacturerId,
      paymentAmount: o.paymentAmount || 0,
      cost: o.cost || 0,
      shippingCost: o.shippingCost || 0,
      fulfillmentType: o.fulfillmentType || null,
      cjDate: o.cjDate ? parseDate(o.cjDate) : null,
      collectedAt: o.collectedAt ? parseDateTime(o.collectedAt) : null,
      status: 'pending' as const,
      excludedReason,
    }
  })
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null

  const digits = dateStr.replace(/\D/g, '')

  if (digits.length === 8) {
    const year = parseInt(digits.slice(0, 4), 10)
    const month = parseInt(digits.slice(4, 6), 10) - 1
    const day = parseInt(digits.slice(6, 8), 10)
    const date = new Date(year, month, day)
    return isNaN(date.getTime()) ? null : date
  }

  const parsed = new Date(dateStr)
  return isNaN(parsed.getTime()) ? null : parsed
}

function parseDateTime(dateTimeStr: string): Date | null {
  if (!dateTimeStr) return null

  const parsed = new Date(dateTimeStr)
  if (!isNaN(parsed.getTime())) {
    return parsed
  }

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

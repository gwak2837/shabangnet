export interface SettlementFilters {
  endDate?: string
  manufacturerId: number
  month?: string
  periodType: 'month' | 'range'
  startDate?: string
}

export interface SettlementListResponse {
  items: SettlementOrder[]
  nextCursor: string | null
  summary?: SettlementSummary
}

export interface SettlementOrder {
  address: string
  collectedAt: string | null
  cost: number
  createdAt: string
  customerName: string
  excludedFromEmail: boolean
  excludedReason?: string
  fulfillmentType: string | null
  id: number
  mallOrderNumber: string | null
  memo: string | null
  optionName: string
  orderName: string | null
  paymentAmount: number
  postalCode: string | null
  productCode: string | null
  productName: string
  quantity: number
  recipientMobile: string | null
  recipientPhone: string | null
  sabangnetOrderNumber: string
  shippingCost: number
  shoppingMall: string | null
  subOrderNumber: string | null
  totalCost: number
  trackingNumber: string | null
}

export interface SettlementSummary {
  excludedOrderCount: number
  manufacturerName: string
  period: string
  totalCost: number
  totalOrders: number
  totalQuantity: number
  totalShippingCost: number
}

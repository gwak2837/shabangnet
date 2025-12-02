'use server'

export interface SettlementData {
  orders: SettlementOrder[]
  summary: SettlementSummary
}

export interface SettlementFilters {
  endDate?: string
  manufacturerId: string
  month?: string
  periodType?: 'month' | 'range'
  startDate?: string
}

// Settlement types
export interface SettlementOrder {
  address: string
  cost: number
  customerName: string
  excludedFromEmail: boolean
  excludedReason?: string
  id: string
  optionName: string
  orderNumber: string
  productName: string
  quantity: number
  sentAt: string
  shippingCost: number
  totalCost: number
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

export async function getSettlementData(filters: SettlementFilters): Promise<SettlementData> {
  // Return empty structure for now - will be populated with real data
  return {
    orders: [],
    summary: {
      totalOrders: 0,
      totalQuantity: 0,
      totalCost: 0,
      totalShippingCost: 0,
      excludedOrderCount: 0,
      manufacturerName: '',
      period: `${filters.startDate} ~ ${filters.endDate}`,
    },
  }
}

export async function getSettlementExcelData(filters: SettlementFilters): Promise<{
  data: Record<string, unknown>[]
  summary: SettlementSummary
}> {
  const settlement = await getSettlementData(filters)

  const data = settlement.orders.map((order) => ({
    주문번호: order.orderNumber,
    발주일: new Date(order.sentAt).toLocaleDateString('ko-KR'),
    상품명: order.productName,
    옵션: order.optionName || '',
    수량: order.quantity,
    원가: order.cost,
    총원가: order.totalCost,
    택배비: order.shippingCost,
    고객명: order.customerName,
    배송지: order.address,
    이메일제외: order.excludedFromEmail ? 'Y' : '',
    제외사유: order.excludedReason || '',
  }))

  return {
    data,
    summary: settlement.summary,
  }
}

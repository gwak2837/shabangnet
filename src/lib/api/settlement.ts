import {
  getExclusionLabel,
  orders as mockOrders,
  sendLogs as mockSendLogs,
  products,
  shouldExcludeFromEmail,
} from '@/lib/mock-data'

// API 지연 시뮬레이션
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export interface SettlementData {
  orders: SettlementOrderItem[]
  summary: SettlementSummary
}

export interface SettlementFilters {
  endDate?: string
  manufacturerId: string
  month?: string // YYYY-MM format
  periodType: 'month' | 'range'
  startDate?: string // YYYY-MM-DD format
}

export interface SettlementOrderItem {
  address: string
  cost: number
  customerName: string
  excludedFromEmail?: boolean // 이메일 발송 제외 여부
  excludedReason?: string // 제외 사유
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
  excludedOrderCount: number // 이메일 제외 주문 수
  manufacturerName: string
  period: string
  totalCost: number
  totalOrders: number
  totalQuantity: number
  totalShippingCost: number
}

export async function getSettlementData(filters: SettlementFilters): Promise<SettlementData> {
  await delay(400)

  const orders: SettlementOrderItem[] = []
  let manufacturerName = ''

  // 1. 이메일 발송된 주문들 (성공한 로그에서)
  const manufacturerLogs = mockSendLogs.filter(
    (log) => log.manufacturerId === filters.manufacturerId && log.status === 'success',
  )

  // Filter by date
  const filteredLogs = manufacturerLogs.filter((log) => {
    const sentDate = new Date(log.sentAt)

    if (filters.periodType === 'month' && filters.month) {
      const [year, month] = filters.month.split('-').map(Number)
      return sentDate.getFullYear() === year && sentDate.getMonth() + 1 === month
    } else if (filters.periodType === 'range') {
      const start = filters.startDate ? new Date(filters.startDate) : new Date(0)
      const end = filters.endDate ? new Date(filters.endDate + 'T23:59:59') : new Date()
      return sentDate >= start && sentDate <= end
    }
    return true
  })

  // Flatten orders from all logs (이메일 발송된 주문)
  filteredLogs.forEach((log) => {
    manufacturerName = log.manufacturerName
    log.orders.forEach((order, orderIndex) => {
      const shippingCost = (order as { shippingCost?: number }).shippingCost || 0
      orders.push({
        id: `${log.id}-${orderIndex}`,
        orderNumber: order.orderNumber,
        sentAt: log.sentAt,
        productName: order.productName,
        optionName: order.optionName,
        quantity: order.quantity,
        cost: order.cost,
        shippingCost,
        totalCost: order.cost * order.quantity,
        customerName: order.customerName,
        address: order.address,
        excludedFromEmail: false,
      })
    })
  })

  // 2. 이메일 제외된 주문들 (해당 제조사의 전체 주문에서 제외 대상만)
  const excludedOrders = mockOrders.filter((order) => {
    if (order.manufacturerId !== filters.manufacturerId) return false
    if (!shouldExcludeFromEmail(order.fulfillmentType)) return false

    // Filter by date
    const orderDate = new Date(order.createdAt)
    if (filters.periodType === 'month' && filters.month) {
      const [year, month] = filters.month.split('-').map(Number)
      return orderDate.getFullYear() === year && orderDate.getMonth() + 1 === month
    } else if (filters.periodType === 'range') {
      const start = filters.startDate ? new Date(filters.startDate) : new Date(0)
      const end = filters.endDate ? new Date(filters.endDate + 'T23:59:59') : new Date()
      return orderDate >= start && orderDate <= end
    }
    return true
  })

  // 제외된 주문 추가
  excludedOrders.forEach((order) => {
    // 상품 정보에서 원가 찾기
    const product = products.find((p) => p.productCode === order.productCode)
    const cost = product?.cost || 0

    if (!manufacturerName && order.manufacturerName) {
      manufacturerName = order.manufacturerName
    }

    orders.push({
      id: `excluded-${order.id}`,
      orderNumber: order.orderNumber,
      sentAt: order.createdAt, // 주문 생성일을 기준으로 표시
      productName: order.productName,
      optionName: order.optionName,
      quantity: order.quantity,
      cost,
      shippingCost: 0,
      totalCost: cost * order.quantity,
      customerName: order.customerName,
      address: order.address,
      excludedFromEmail: true,
      excludedReason: getExclusionLabel(order.fulfillmentType) || order.fulfillmentType,
    })
  })

  // Calculate summary
  const totalOrders = orders.length
  const totalQuantity = orders.reduce((sum, o) => sum + o.quantity, 0)
  const totalCost = orders.reduce((sum, o) => sum + o.totalCost, 0)
  const totalShippingCost = orders.reduce((sum, o) => sum + o.shippingCost, 0)
  const excludedOrderCount = orders.filter((o) => o.excludedFromEmail).length

  // Format period string
  let period = ''
  if (filters.periodType === 'month' && filters.month) {
    period = filters.month.replace('-', '년 ') + '월'
  } else if (filters.periodType === 'range') {
    period = `${filters.startDate || ''} ~ ${filters.endDate || ''}`
  }

  return {
    orders,
    summary: {
      totalOrders,
      totalQuantity,
      totalCost,
      totalShippingCost,
      excludedOrderCount,
      manufacturerName,
      period,
    },
  }
}

// Generate Excel data for download
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

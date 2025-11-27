import { sendLogs as mockSendLogs } from '@/lib/mock-data'

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
  id: string
  optionName: string
  orderNumber: string
  productName: string
  quantity: number
  sentAt: string
  totalCost: number
}

export interface SettlementSummary {
  manufacturerName: string
  period: string
  totalCost: number
  totalOrders: number
  totalQuantity: number
}

export async function getSettlementData(filters: SettlementFilters): Promise<SettlementData> {
  await delay(400)

  // Filter send logs by manufacturer and status
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

  // Flatten orders from all logs
  const orders: SettlementOrderItem[] = []
  filteredLogs.forEach((log) => {
    log.orders.forEach((order, orderIndex) => {
      orders.push({
        id: `${log.id}-${orderIndex}`,
        orderNumber: order.orderNumber,
        sentAt: log.sentAt,
        productName: order.productName,
        optionName: order.optionName,
        quantity: order.quantity,
        cost: order.cost,
        totalCost: order.cost * order.quantity,
        customerName: order.customerName,
        address: order.address,
      })
    })
  })

  // Calculate summary
  const totalOrders = orders.length
  const totalQuantity = orders.reduce((sum, o) => sum + o.quantity, 0)
  const totalCost = orders.reduce((sum, o) => sum + o.totalCost, 0)

  // Get manufacturer name from first log (or empty)
  const manufacturerName = filteredLogs[0]?.manufacturerName || ''

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
    고객명: order.customerName,
    배송지: order.address,
  }))

  return {
    data,
    summary: settlement.summary,
  }
}

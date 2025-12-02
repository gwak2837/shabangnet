'use server'

import { and, eq, gte, lte } from 'drizzle-orm'

import { db } from '@/db/client'
import { manufacturers } from '@/db/schema/manufacturers'
import { orders } from '@/db/schema/orders'

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
  // Parse date range
  const { startDate, endDate } = getDateRange(filters)

  // Get manufacturer info
  const manufacturer = await db.query.manufacturers.findFirst({
    where: eq(manufacturers.id, filters.manufacturerId),
  })

  if (!manufacturer) {
    return createEmptySettlement(filters)
  }

  // Query completed orders for the manufacturer within the date range
  const result = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.manufacturerId, filters.manufacturerId),
        eq(orders.status, 'completed'),
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
      ),
    )
    .orderBy(orders.createdAt)

  // Map to SettlementOrder
  const settlementOrders: SettlementOrder[] = result.map((order) => {
    const cost = Number(order.cost || 0)
    const shippingCost = Number(order.shippingCost || 0)
    const quantity = order.quantity || 1
    const totalCost = cost * quantity + shippingCost

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      productName: order.productName || '',
      optionName: order.optionName || '',
      quantity,
      cost,
      shippingCost,
      totalCost,
      customerName: order.recipientName || '',
      address: order.address || '',
      sentAt: order.createdAt.toISOString(),
      excludedFromEmail: !!order.excludedReason,
      excludedReason: order.excludedReason || undefined,
    }
  })

  // Calculate summary
  const totalOrders = settlementOrders.length
  const totalQuantity = settlementOrders.reduce((sum, o) => sum + o.quantity, 0)
  const totalCost = settlementOrders.reduce((sum, o) => sum + o.cost * o.quantity, 0)
  const totalShippingCost = settlementOrders.reduce((sum, o) => sum + o.shippingCost, 0)
  const excludedOrderCount = settlementOrders.filter((o) => o.excludedFromEmail).length

  const period = formatPeriod(filters)

  return {
    orders: settlementOrders,
    summary: {
      totalOrders,
      totalQuantity,
      totalCost,
      totalShippingCost,
      excludedOrderCount,
      manufacturerName: manufacturer.name,
      period,
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

function createEmptySettlement(filters: SettlementFilters): SettlementData {
  return {
    orders: [],
    summary: {
      totalOrders: 0,
      totalQuantity: 0,
      totalCost: 0,
      totalShippingCost: 0,
      excludedOrderCount: 0,
      manufacturerName: '',
      period: formatPeriod(filters),
    },
  }
}

function formatPeriod(filters: SettlementFilters): string {
  if (filters.periodType === 'month' && filters.month) {
    const [year, month] = filters.month.split('-')
    return `${year}년 ${month}월`
  }
  return `${filters.startDate || ''} ~ ${filters.endDate || ''}`
}

function getDateRange(filters: SettlementFilters): { endDate: Date; startDate: Date } {
  if (filters.periodType === 'month' && filters.month) {
    const [year, month] = filters.month.split('-').map(Number)
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999) // Last day of month
    return { startDate, endDate }
  }

  // Range type
  const startDate = filters.startDate ? new Date(filters.startDate) : new Date()
  const endDate = filters.endDate ? new Date(filters.endDate) : new Date()
  endDate.setHours(23, 59, 59, 999)

  return { startDate, endDate }
}

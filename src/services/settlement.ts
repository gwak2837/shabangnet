'use server'

import { and, eq, gte, lte } from 'drizzle-orm'

import { db } from '@/db/client'
import { manufacturer } from '@/db/schema/manufacturers'
import { order } from '@/db/schema/orders'
import { orderExcludedReasonSql } from '@/services/order-exclusion'

export interface SettlementData {
  orders: SettlementOrder[]
  summary: SettlementSummary
}

export interface SettlementFilters {
  endDate?: string
  manufacturerId: number
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
  id: number
  optionName: string
  productName: string
  quantity: number
  sabangnetOrderNumber: string
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
  const [mfr] = await db
    .select({ name: manufacturer.name })
    .from(manufacturer)
    .where(eq(manufacturer.id, filters.manufacturerId))

  if (!mfr) {
    return createEmptySettlement(filters)
  }

  // Query completed orders for the manufacturer within the date range
  const result = await db
    .select({
      id: order.id,
      sabangnetOrderNumber: order.sabangnetOrderNumber,
      productName: order.productName,
      optionName: order.optionName,
      quantity: order.quantity,
      cost: order.cost,
      shippingCost: order.shippingCost,
      recipientName: order.recipientName,
      address: order.address,
      createdAt: order.createdAt,
      excludedReason: orderExcludedReasonSql(order.fulfillmentType),
    })
    .from(order)
    .where(
      and(
        eq(order.manufacturerId, filters.manufacturerId),
        eq(order.status, 'completed'),
        gte(order.createdAt, startDate),
        lte(order.createdAt, endDate),
      ),
    )
    .orderBy(order.createdAt)

  // Map to SettlementOrder
  const settlementOrders: SettlementOrder[] = result.map((o) => {
    const cost = o.cost ?? 0
    const shippingCost = o.shippingCost ?? 0
    const quantity = o.quantity || 1
    const totalCost = cost + shippingCost
    const excludedReason = typeof o.excludedReason === 'string' ? o.excludedReason.trim() : ''
    const excludedFromEmail = excludedReason.length > 0

    return {
      id: o.id,
      sabangnetOrderNumber: o.sabangnetOrderNumber,
      productName: o.productName || '',
      optionName: o.optionName || '',
      quantity,
      cost,
      shippingCost,
      totalCost,
      customerName: o.recipientName || '',
      address: o.address || '',
      sentAt: o.createdAt.toISOString(),
      excludedFromEmail,
      excludedReason: excludedFromEmail ? excludedReason : undefined,
    }
  })

  // Calculate summary
  const totalOrders = settlementOrders.length
  const totalQuantity = settlementOrders.reduce((sum, o) => sum + o.quantity, 0)
  const totalCost = settlementOrders.reduce((sum, o) => sum + o.cost, 0)
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
      manufacturerName: mfr.name,
      period,
    },
  }
}

export async function getSettlementExcelData(filters: SettlementFilters): Promise<{
  data: Record<string, unknown>[]
  summary: SettlementSummary
}> {
  const settlement = await getSettlementData(filters)

  const data = settlement.orders.map((o) => ({
    사방넷주문번호: o.sabangnetOrderNumber,
    발주일: new Date(o.sentAt).toLocaleDateString('ko-KR'),
    상품명: o.productName,
    옵션: o.optionName || '',
    수량: o.quantity,
    원가: o.cost,
    총원가: o.totalCost,
    택배비: o.shippingCost,
    고객명: o.customerName,
    배송지: o.address,
    이메일제외: o.excludedFromEmail ? 'Y' : '',
    제외사유: o.excludedReason || '',
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

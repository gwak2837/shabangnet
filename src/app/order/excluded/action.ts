'use server'

import { desc } from 'drizzle-orm'

import { db } from '@/db/client'
import { order } from '@/db/schema/orders'
import { orderExcludedReasonSql, orderIsExcludedSql } from '@/services/order-exclusion'

export interface ExcludedOrder {
  address: string
  createdAt: string
  customerName: string
  fulfillmentType?: string
  id: number
  manufacturerId: number
  manufacturerName: string
  optionName: string
  phone: string
  price: number
  productCode: string
  productName: string
  quantity: number
  sabangnetOrderNumber: string
  status: OrderStatus
}

export interface ExcludedReasonBatch {
  orders: ExcludedOrder[]
  reason: string
  totalAmount: number
  totalOrders: number
}

type OrderStatus = 'completed' | 'error' | 'pending' | 'processing'

export async function getExcludedBatches(): Promise<ExcludedReasonBatch[]> {
  const allOrders = await db
    .select({
      id: order.id,
      sabangnetOrderNumber: order.sabangnetOrderNumber,
      recipientName: order.recipientName,
      recipientPhone: order.recipientPhone,
      recipientMobile: order.recipientMobile,
      address: order.address,
      productCode: order.productCode,
      productName: order.productName,
      optionName: order.optionName,
      quantity: order.quantity,
      paymentAmount: order.paymentAmount,
      manufacturerId: order.manufacturerId,
      manufacturerName: order.manufacturerName,
      status: order.status,
      createdAt: order.createdAt,
      fulfillmentType: order.fulfillmentType,
      excludedReason: orderExcludedReasonSql(order.fulfillmentType),
    })
    .from(order)
    .where(orderIsExcludedSql(order.fulfillmentType))
    .orderBy(desc(order.createdAt))

  const batchesByReason = new Map<string, ExcludedReasonBatch>()

  for (const o of allOrders) {
    const rawReason = typeof o.excludedReason === 'string' ? o.excludedReason.trim() : ''
    const reason = rawReason.length > 0 ? rawReason : '사유 없음'

    const batch =
      batchesByReason.get(reason) ??
      (() => {
        const next: ExcludedReasonBatch = {
          reason,
          orders: [],
          totalAmount: 0,
          totalOrders: 0,
        }
        batchesByReason.set(reason, next)
        return next
      })()

    batch.orders.push({
      id: o.id,
      sabangnetOrderNumber: o.sabangnetOrderNumber,
      customerName: o.recipientName || '',
      phone: o.recipientMobile || o.recipientPhone || '',
      address: o.address || '',
      productCode: o.productCode || '',
      productName: o.productName || '',
      optionName: o.optionName || '',
      quantity: o.quantity || 0,
      price: (() => {
        const quantity = o.quantity && o.quantity > 0 ? o.quantity : 1
        return Math.round((o.paymentAmount ?? 0) / quantity)
      })(),
      manufacturerId: o.manufacturerId ?? 0,
      manufacturerName: o.manufacturerName || '',
      status: o.status as OrderStatus,
      createdAt: o.createdAt.toISOString(),
      fulfillmentType: o.fulfillmentType || '',
    })
  }

  for (const batch of batchesByReason.values()) {
    batch.totalOrders = batch.orders.length
    batch.totalAmount = batch.orders.reduce((sum, o) => sum + o.price * o.quantity, 0)
  }

  return Array.from(batchesByReason.values()).sort(
    (a, b) => b.totalOrders - a.totalOrders || a.reason.localeCompare(b.reason, 'ko'),
  )
}

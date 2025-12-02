'use server'

import { eq, inArray } from 'drizzle-orm'

import { db } from '@/db/client'
import { manufacturers } from '@/db/schema/manufacturers'
import { emailLogs, orders } from '@/db/schema/orders'

import { getExclusionSettings } from './settings'

export type DuplicateCheckPeriod = 10 | 15 | 20 | 30

export interface DuplicateCheckResult {
  duplicateLogs: SendLogSummary[]
  hasDuplicate: boolean
  matchedAddresses: string[]
}

// Order types
export interface Order {
  address: string
  createdAt: string
  customerName: string
  fulfillmentType?: string
  id: string
  manufacturerId: string
  manufacturerName: string
  optionName: string
  orderName?: string
  orderNumber: string
  phone: string
  price: number
  productCode: string
  productName: string
  quantity: number
  status: 'completed' | 'error' | 'pending' | 'processing'
}

export interface OrderBatch {
  email: string
  lastSentAt?: string
  manufacturerId: string
  manufacturerName: string
  orders: Order[]
  status: 'error' | 'pending' | 'ready' | 'sent'
  totalAmount: number
  totalOrders: number
}

export interface SendLogSummary {
  id: string
  manufacturerName: string
  orderCount: number
  recipientAddresses: string[]
  sentAt: string
  totalAmount: number
}

export interface SendOrdersParams {
  duplicateReason?: string
  manufacturerId: string
  orderIds: string[]
}

export interface SendOrdersResult {
  errorMessage?: string
  sentCount: number
  success: boolean
}

export async function checkDuplicate(
  manufacturerId: string,
  recipientAddresses: string[],
  periodDays: DuplicateCheckPeriod = 10,
): Promise<DuplicateCheckResult> {
  const now = new Date()
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)

  const recentLogs = await db.query.emailLogs.findMany({
    where: (logs, { and, eq, gte }) =>
      and(eq(logs.manufacturerId, manufacturerId), eq(logs.status, 'success'), gte(logs.sentAt, periodStart)),
  })

  const matchedAddresses: string[] = []
  const duplicateLogs: SendLogSummary[] = []

  for (const log of recentLogs) {
    if (!log.recipientAddresses) continue

    const logAddresses = log.recipientAddresses as string[]
    const matches = recipientAddresses.filter((addr) =>
      logAddresses.some((logAddr) => normalizeAddress(logAddr) === normalizeAddress(addr)),
    )

    if (matches.length > 0) {
      matchedAddresses.push(...matches)
      duplicateLogs.push({
        id: log.id,
        manufacturerName: log.manufacturerName,
        orderCount: log.orderCount || 0,
        recipientAddresses: logAddresses,
        totalAmount: Number(log.totalAmount || 0),
        sentAt: log.sentAt?.toISOString() || '',
      })
    }
  }

  const uniqueMatchedAddresses = [...new Set(matchedAddresses)]

  return {
    hasDuplicate: uniqueMatchedAddresses.length > 0,
    duplicateLogs,
    matchedAddresses: uniqueMatchedAddresses,
  }
}

export async function getBatches(): Promise<OrderBatch[]> {
  const allOrders = await db.query.orders.findMany({
    with: {
      manufacturer: true,
    },
    where: (orders, { isNotNull }) => isNotNull(orders.manufacturerId),
  })

  const batchesMap = new Map<string, OrderBatch>()
  const allManufacturers = await db
    .select({
      id: manufacturers.id,
      name: manufacturers.name,
      email: manufacturers.email,
    })
    .from(manufacturers)

  for (const m of allManufacturers) {
    batchesMap.set(m.id, {
      manufacturerId: m.id,
      manufacturerName: m.name,
      email: m.email,
      orders: [],
      status: 'pending',
      totalAmount: 0,
      totalOrders: 0,
    })
  }

  for (const order of allOrders) {
    if (!order.manufacturerId) continue

    const isExcluded = await shouldExcludeFromEmail(order.shoppingMall ?? order.courier ?? undefined)
    if (isExcluded) continue

    const batch = batchesMap.get(order.manufacturerId)
    if (batch) {
      batch.orders.push({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.recipientName || '',
        phone: order.recipientMobile || order.recipientPhone || '',
        address: order.address || '',
        productCode: order.productCode || '',
        productName: order.productName || '',
        optionName: order.optionName || '',
        quantity: order.quantity || 0,
        price: Number(order.paymentAmount || 0),
        manufacturerId: order.manufacturerId,
        manufacturerName: order.manufacturerName || '',
        status: order.status as Order['status'],
        createdAt: order.createdAt.toISOString(),
        fulfillmentType: order.shoppingMall || '',
      })
    }
  }

  for (const batch of batchesMap.values()) {
    batch.totalOrders = batch.orders.length
    batch.totalAmount = batch.orders.reduce((sum, o) => sum + o.price * o.quantity, 0)

    if (batch.orders.some((o) => o.status === 'error')) {
      batch.status = 'error'
    } else if (batch.orders.length > 0 && batch.orders.every((o) => o.status === 'completed')) {
      batch.status = 'sent'
    } else {
      batch.status = 'pending'
    }
  }

  return Array.from(batchesMap.values())
}

export async function getExcludedBatches(): Promise<OrderBatch[]> {
  const allOrders = await db.query.orders.findMany({
    with: {
      manufacturer: true,
    },
    where: (orders, { isNotNull }) => isNotNull(orders.manufacturerId),
  })

  const batchesMap = new Map<string, OrderBatch>()
  const allManufacturers = await db
    .select({
      id: manufacturers.id,
      name: manufacturers.name,
      email: manufacturers.email,
    })
    .from(manufacturers)

  for (const m of allManufacturers) {
    batchesMap.set(m.id, {
      manufacturerId: m.id,
      manufacturerName: m.name,
      email: m.email,
      orders: [],
      status: 'pending',
      totalAmount: 0,
      totalOrders: 0,
    })
  }

  for (const order of allOrders) {
    if (!order.manufacturerId) continue

    const isExcluded = await shouldExcludeFromEmail(order.shoppingMall ?? order.courier ?? undefined)
    if (!isExcluded) continue

    const batch = batchesMap.get(order.manufacturerId)
    if (batch) {
      batch.orders.push({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.recipientName || '',
        phone: order.recipientMobile || order.recipientPhone || '',
        address: order.address || '',
        productCode: order.productCode || '',
        productName: order.productName || '',
        optionName: order.optionName || '',
        quantity: order.quantity || 0,
        price: Number(order.paymentAmount || 0),
        manufacturerId: order.manufacturerId,
        manufacturerName: order.manufacturerName || '',
        status: order.status as Order['status'],
        createdAt: order.createdAt.toISOString(),
        fulfillmentType: order.shoppingMall || '',
      })
    }
  }

  for (const batch of batchesMap.values()) {
    batch.totalOrders = batch.orders.length
    batch.totalAmount = batch.orders.reduce((sum, o) => sum + o.price * o.quantity, 0)
  }

  return Array.from(batchesMap.values()).filter((b) => b.totalOrders > 0)
}

export async function sendOrders(params: SendOrdersParams): Promise<SendOrdersResult> {
  const manufacturer = await db.query.manufacturers.findFirst({
    where: eq(manufacturers.id, params.manufacturerId),
  })

  if (!manufacturer) {
    return { success: false, sentCount: 0, errorMessage: 'Manufacturer not found' }
  }

  const ordersToSend = await db.query.orders.findMany({
    where: inArray(orders.id, params.orderIds),
  })

  const totalAmount = ordersToSend.reduce((sum, o) => sum + Number(o.paymentAmount || 0) * (o.quantity || 1), 0)
  const recipientAddresses = ordersToSend.map((o) => o.address || '').filter(Boolean)

  return await db.transaction(async (tx) => {
    await tx.insert(emailLogs).values({
      id: `log_${Date.now()}`,
      manufacturerId: manufacturer.id,
      manufacturerName: manufacturer.name,
      email: manufacturer.email,
      subject: `[발주서] ${manufacturer.name} ${new Date().toISOString().split('T')[0]}`,
      orderCount: ordersToSend.length,
      totalAmount: totalAmount.toString(),
      status: 'success',
      recipientAddresses: recipientAddresses,
      sentAt: new Date(),
      sentBy: 'system',
    })

    await tx.update(orders).set({ status: 'completed' }).where(inArray(orders.id, params.orderIds))

    return { success: true, sentCount: ordersToSend.length }
  })
}

// Helper function to normalize address for comparison
function normalizeAddress(address: string): string {
  return address.replace(/\s+/g, '').replace(/[,.-]/g, '').toLowerCase()
}

// Helper function to check if fulfillment type should be excluded
async function shouldExcludeFromEmail(fulfillmentType?: string): Promise<boolean> {
  if (!fulfillmentType) return false

  const exclusionSettings = await getExclusionSettings()
  if (!exclusionSettings.enabled) return false

  return exclusionSettings.patterns.some((p) => p.enabled && fulfillmentType.includes(p.pattern))
}

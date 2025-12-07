'use server'

import { and, desc, eq, gte, lte } from 'drizzle-orm'

import { db } from '@/db/client'
import { orderEmailLog } from '@/db/schema/orders'

export interface LogFilters {
  endDate?: string
  manufacturerId?: number
  startDate?: string
  status?: 'all' | 'failed' | 'pending' | 'success'
}

export interface SendLog {
  duplicateReason?: string
  email: string
  errorMessage?: string
  fileName: string
  id: number
  manufacturerId: number | null
  manufacturerName: string
  orderCount: number
  orders: SendLogOrder[]
  recipientAddresses: string[]
  sentAt: string
  sentBy: string
  status: 'failed' | 'pending' | 'success'
  subject: string
  totalAmount: number
}

// Log types
export interface SendLogOrder {
  address: string
  cost: number
  customerName: string
  optionName: string
  orderNumber: string
  price: number
  productName: string
  quantity: number
}

export async function getAll(): Promise<SendLog[]> {
  const result = await db.select().from(orderEmailLog).orderBy(desc(orderEmailLog.sentAt))
  return result.map(mapToSendLog)
}

export async function getById(id: number): Promise<SendLog | undefined> {
  const result = await db.query.orderEmailLog.findFirst({
    where: eq(orderEmailLog.id, id),
    with: {
      items: true,
    },
  })

  if (!result) return undefined

  const mapped = mapToSendLog(result)
  mapped.orders = result.items.map((o) => ({
    address: o.address || '',
    cost: Number(o.cost || 0),
    customerName: o.customerName || '',
    optionName: o.optionName || '',
    orderNumber: o.orderNumber,
    price: Number(o.price || 0),
    productName: o.productName,
    quantity: o.quantity || 0,
  }))

  return mapped
}

export async function getFiltered(filters: LogFilters): Promise<SendLog[]> {
  const conditions = []

  if (filters.manufacturerId) {
    conditions.push(eq(orderEmailLog.manufacturerId, filters.manufacturerId))
  }

  if (filters.status && filters.status !== 'all') {
    conditions.push(eq(orderEmailLog.status, filters.status))
  }

  if (filters.startDate) {
    conditions.push(gte(orderEmailLog.sentAt, new Date(filters.startDate)))
  }

  if (filters.endDate) {
    const endDate = new Date(filters.endDate)
    endDate.setHours(23, 59, 59, 999)
    conditions.push(lte(orderEmailLog.sentAt, endDate))
  }

  const result = await db
    .select()
    .from(orderEmailLog)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(orderEmailLog.sentAt))

  return result.map(mapToSendLog)
}

function mapToSendLog(log: typeof orderEmailLog.$inferSelect): SendLog {
  return {
    id: log.id,
    manufacturerId: log.manufacturerId ?? null,
    manufacturerName: log.manufacturerName,
    email: log.email,
    subject: log.subject,
    fileName: log.fileName || '',
    orderCount: log.orderCount || 0,
    totalAmount: Number(log.totalAmount || 0),
    status: log.status as SendLog['status'],
    errorMessage: log.errorMessage || undefined,
    recipientAddresses: (log.recipientAddresses as string[]) || [],
    duplicateReason: log.duplicateReason || undefined,
    sentAt: log.sentAt ? log.sentAt.toISOString() : new Date().toISOString(),
    sentBy: log.sentBy || 'Unknown',
    orders: [],
  }
}

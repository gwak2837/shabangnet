'use server'

import { and, desc, eq, gte, lte } from 'drizzle-orm'

import { db } from '@/db/client'
import { emailLogs } from '@/db/schema/orders'

export interface LogFilters {
  endDate?: string
  manufacturerId?: string
  startDate?: string
  status?: 'all' | 'failed' | 'pending' | 'success'
}

export interface SendLog {
  duplicateReason?: string
  email: string
  errorMessage?: string
  fileName: string
  id: string
  manufacturerId: string
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
  const result = await db.select().from(emailLogs).orderBy(desc(emailLogs.sentAt))
  return result.map(mapToSendLog)
}

export async function getById(id: string): Promise<SendLog | undefined> {
  const result = await db.query.emailLogs.findFirst({
    where: eq(emailLogs.id, id),
    with: {
      orders: true,
    },
  })

  if (!result) return undefined

  const mapped = mapToSendLog(result)
  mapped.orders = result.orders.map((o) => ({
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

  if (filters.manufacturerId && filters.manufacturerId !== 'all') {
    conditions.push(eq(emailLogs.manufacturerId, filters.manufacturerId))
  }

  if (filters.status && filters.status !== 'all') {
    conditions.push(eq(emailLogs.status, filters.status))
  }

  if (filters.startDate) {
    conditions.push(gte(emailLogs.sentAt, new Date(filters.startDate)))
  }

  if (filters.endDate) {
    const endDate = new Date(filters.endDate)
    endDate.setHours(23, 59, 59, 999)
    conditions.push(lte(emailLogs.sentAt, endDate))
  }

  const result = await db
    .select()
    .from(emailLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(emailLogs.sentAt))

  return result.map(mapToSendLog)
}

function mapToSendLog(log: typeof emailLogs.$inferSelect): SendLog {
  return {
    id: log.id,
    manufacturerId: log.manufacturerId || '',
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

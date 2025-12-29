'use server'

import { and, desc, eq, gte, lte } from 'drizzle-orm'

import { db } from '@/db/client'
import { orderEmailLog, orderEmailLogItem } from '@/db/schema/orders'

export interface LogFilters {
  endDate?: string
  manufacturerId?: number
  startDate?: string
  status?: 'all' | 'failed' | 'pending' | 'success'
}

export interface SendLog {
  duplicateReason?: string
  emails: string[]
  errorMessage?: string
  fileName: string
  hasAttachment: boolean
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
  price: number
  productName: string
  quantity: number
  sabangnetOrderNumber: string
}

type SendLogRow = Pick<
  typeof orderEmailLog.$inferSelect,
  | 'attachmentFileSize'
  | 'duplicateReason'
  | 'emails'
  | 'errorMessage'
  | 'fileName'
  | 'id'
  | 'manufacturerId'
  | 'manufacturerName'
  | 'orderCount'
  | 'recipientAddresses'
  | 'sentAt'
  | 'sentBy'
  | 'status'
  | 'subject'
  | 'totalAmount'
>

export async function getAll(): Promise<SendLog[]> {
  const result = await db
    .select({
      id: orderEmailLog.id,
      manufacturerId: orderEmailLog.manufacturerId,
      manufacturerName: orderEmailLog.manufacturerName,
      emails: orderEmailLog.emails,
      subject: orderEmailLog.subject,
      fileName: orderEmailLog.fileName,
      attachmentFileSize: orderEmailLog.attachmentFileSize,
      orderCount: orderEmailLog.orderCount,
      totalAmount: orderEmailLog.totalAmount,
      status: orderEmailLog.status,
      errorMessage: orderEmailLog.errorMessage,
      recipientAddresses: orderEmailLog.recipientAddresses,
      duplicateReason: orderEmailLog.duplicateReason,
      sentAt: orderEmailLog.sentAt,
      sentBy: orderEmailLog.sentBy,
    })
    .from(orderEmailLog)
    .orderBy(desc(orderEmailLog.sentAt))
  return result.map(mapToSendLog)
}

export async function getById(id: number): Promise<SendLog | undefined> {
  const [result] = await db
    .select({
      id: orderEmailLog.id,
      manufacturerId: orderEmailLog.manufacturerId,
      manufacturerName: orderEmailLog.manufacturerName,
      emails: orderEmailLog.emails,
      subject: orderEmailLog.subject,
      fileName: orderEmailLog.fileName,
      attachmentFileSize: orderEmailLog.attachmentFileSize,
      orderCount: orderEmailLog.orderCount,
      totalAmount: orderEmailLog.totalAmount,
      status: orderEmailLog.status,
      errorMessage: orderEmailLog.errorMessage,
      recipientAddresses: orderEmailLog.recipientAddresses,
      duplicateReason: orderEmailLog.duplicateReason,
      sentAt: orderEmailLog.sentAt,
      sentBy: orderEmailLog.sentBy,
    })
    .from(orderEmailLog)
    .where(eq(orderEmailLog.id, id))

  if (!result) {
    return undefined
  }

  const items = await db
    .select({
      address: orderEmailLogItem.address,
      cost: orderEmailLogItem.cost,
      customerName: orderEmailLogItem.customerName,
      optionName: orderEmailLogItem.optionName,
      price: orderEmailLogItem.price,
      productName: orderEmailLogItem.productName,
      quantity: orderEmailLogItem.quantity,
      sabangnetOrderNumber: orderEmailLogItem.sabangnetOrderNumber,
      shippingCost: orderEmailLogItem.shippingCost,
    })
    .from(orderEmailLogItem)
    .where(eq(orderEmailLogItem.emailLogId, id))

  const mapped = mapToSendLog(result)
  mapped.orders = items.map((o) => ({
    address: o.address || '',
    cost: o.cost ?? 0,
    customerName: o.customerName || '',
    optionName: o.optionName || '',
    sabangnetOrderNumber: o.sabangnetOrderNumber,
    price: o.price ?? 0,
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
    .select({
      id: orderEmailLog.id,
      manufacturerId: orderEmailLog.manufacturerId,
      manufacturerName: orderEmailLog.manufacturerName,
      emails: orderEmailLog.emails,
      subject: orderEmailLog.subject,
      fileName: orderEmailLog.fileName,
      attachmentFileSize: orderEmailLog.attachmentFileSize,
      orderCount: orderEmailLog.orderCount,
      totalAmount: orderEmailLog.totalAmount,
      status: orderEmailLog.status,
      errorMessage: orderEmailLog.errorMessage,
      recipientAddresses: orderEmailLog.recipientAddresses,
      duplicateReason: orderEmailLog.duplicateReason,
      sentAt: orderEmailLog.sentAt,
      sentBy: orderEmailLog.sentBy,
    })
    .from(orderEmailLog)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(orderEmailLog.sentAt))

  return result.map(mapToSendLog)
}

function mapToSendLog(log: SendLogRow): SendLog {
  return {
    id: log.id,
    manufacturerId: log.manufacturerId ?? null,
    manufacturerName: log.manufacturerName,
    emails: Array.isArray(log.emails) ? log.emails : [],
    subject: log.subject,
    fileName: log.fileName || '',
    hasAttachment: (log.attachmentFileSize ?? 0) > 0,
    orderCount: log.orderCount || 0,
    totalAmount: log.totalAmount ?? 0,
    status: log.status as SendLog['status'],
    errorMessage: log.errorMessage || undefined,
    recipientAddresses: (log.recipientAddresses as string[]) || [],
    duplicateReason: log.duplicateReason || undefined,
    sentAt: log.sentAt ? log.sentAt.toISOString() : new Date().toISOString(),
    sentBy: log.sentBy || 'Unknown',
    orders: [],
  }
}

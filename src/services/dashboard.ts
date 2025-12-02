'use server'

import { desc, eq, sql } from 'drizzle-orm'

import { db } from '@/db/client'
import { manufacturers } from '@/db/schema/manufacturers'
import { orders, uploads } from '@/db/schema/orders'

// Dashboard types
export interface ChartDataItem {
  amount: number
  name: string
  orders: number
}

export interface DashboardStats {
  completedOrders: number
  completedOrdersChange: number
  errorOrders: number
  errorOrdersChange: number
  pendingOrders: number
  pendingOrdersChange: number
  todayOrders: number
  todayOrdersChange: number
}

export interface Upload {
  errorOrders: number
  fileName: string
  fileSize: number
  id: string
  processedOrders: number
  status: 'completed' | 'error' | 'processing'
  totalOrders: number
  uploadedAt: string
}

export async function getChartData(): Promise<ChartDataItem[]> {
  const result = await db
    .select({
      name: manufacturers.name,
      orders: sql<number>`count(${orders.id})`.mapWith(Number),
      amount: sql<number>`sum(${orders.paymentAmount} * ${orders.quantity})`.mapWith(Number),
    })
    .from(orders)
    .leftJoin(manufacturers, eq(orders.manufacturerId, manufacturers.id))
    .where(eq(orders.status, 'pending'))
    .groupBy(manufacturers.name)

  return result.map((r) => ({
    name: r.name || 'Unknown',
    orders: r.orders,
    amount: r.amount || 0,
  }))
}

export async function getRecentUploads(): Promise<Upload[]> {
  const result = await db.select().from(uploads).orderBy(desc(uploads.uploadedAt)).limit(5)

  return result.map((u) => ({
    id: u.id,
    fileName: u.fileName,
    fileSize: u.fileSize || 0,
    totalOrders: u.totalOrders || 0,
    processedOrders: u.processedOrders || 0,
    errorOrders: u.errorOrders || 0,
    status: u.status as 'completed' | 'error' | 'processing',
    uploadedAt: u.uploadedAt.toISOString(),
  }))
}

export async function getStats(): Promise<DashboardStats> {
  const [stats] = await db
    .select({
      todayOrders: sql<number>`count(case when date(${orders.createdAt}) = current_date then 1 end)`.mapWith(Number),
      pendingOrders: sql<number>`count(case when ${orders.status} = 'pending' then 1 end)`.mapWith(Number),
      completedOrders: sql<number>`count(case when ${orders.status} = 'completed' then 1 end)`.mapWith(Number),
      errorOrders: sql<number>`count(case when ${orders.status} = 'error' then 1 end)`.mapWith(Number),
    })
    .from(orders)

  return {
    todayOrders: stats.todayOrders,
    todayOrdersChange: 0,
    pendingOrders: stats.pendingOrders,
    pendingOrdersChange: 0,
    completedOrders: stats.completedOrders,
    completedOrdersChange: 0,
    errorOrders: stats.errorOrders,
    errorOrdersChange: 0,
  }
}

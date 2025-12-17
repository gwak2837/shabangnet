'use server'

import { desc, eq, sql } from 'drizzle-orm'

import { db } from '@/db/client'
import { manufacturer } from '@/db/schema/manufacturers'
import { order, upload } from '@/db/schema/orders'

// Dashboard types
export interface ChartDataItem {
  amount: number
  name: string
  orders: number
}

export interface DashboardStats {
  completedOrders: number
  completedOrdersChange?: number
  errorOrders: number
  errorOrdersChange?: number
  pendingOrders: number
  pendingOrdersChange?: number
  todayOrders: number
  todayOrdersChange?: number
}

export interface Upload {
  errorOrders: number
  fileName: string
  fileSize: number
  id: number
  processedOrders: number
  status: 'completed' | 'error' | 'processing'
  totalOrders: number
  uploadedAt: string
}

export async function getChartData(): Promise<ChartDataItem[]> {
  const result = await db
    .select({
      name: manufacturer.name,
      orders: sql<number>`count(${order.id})`.mapWith(Number),
      // 결제금액은 "수량 포함" 총액이에요.
      amount: sql<number>`sum(${order.paymentAmount})`.mapWith(Number),
    })
    .from(order)
    .leftJoin(manufacturer, eq(order.manufacturerId, manufacturer.id))
    .where(eq(order.status, 'pending'))
    .groupBy(manufacturer.name)

  return result.map((r) => ({
    name: r.name || 'Unknown',
    orders: r.orders,
    amount: r.amount || 0,
  }))
}

export async function getRecentUploads(): Promise<Upload[]> {
  const result = await db.select().from(upload).orderBy(desc(upload.uploadedAt)).limit(5)

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
      todayOrders: sql<number>`count(case when date(${order.createdAt}) = current_date then 1 end)`.mapWith(Number),
      yesterdayOrders:
        sql<number>`count(case when date(${order.createdAt}) = (current_date - interval '1 day') then 1 end)`.mapWith(
          Number,
        ),

      pendingOrders:
        sql<number>`count(case when date(${order.createdAt}) = current_date and ${order.status} = 'pending' then 1 end)`.mapWith(
          Number,
        ),
      yesterdayPendingOrders:
        sql<number>`count(case when date(${order.createdAt}) = (current_date - interval '1 day') and ${order.status} = 'pending' then 1 end)`.mapWith(
          Number,
        ),

      completedOrders:
        sql<number>`count(case when date(${order.createdAt}) = current_date and ${order.status} = 'completed' then 1 end)`.mapWith(
          Number,
        ),
      yesterdayCompletedOrders:
        sql<number>`count(case when date(${order.createdAt}) = (current_date - interval '1 day') and ${order.status} = 'completed' then 1 end)`.mapWith(
          Number,
        ),

      errorOrders:
        sql<number>`count(case when date(${order.createdAt}) = current_date and ${order.status} = 'error' then 1 end)`.mapWith(
          Number,
        ),
      yesterdayErrorOrders:
        sql<number>`count(case when date(${order.createdAt}) = (current_date - interval '1 day') and ${order.status} = 'error' then 1 end)`.mapWith(
          Number,
        ),
    })
    .from(order)

  function getChange(today: number, yesterday: number): number | undefined {
    if (yesterday <= 0) return undefined
    return Math.round(((today - yesterday) / yesterday) * 100)
  }

  return {
    todayOrders: stats.todayOrders,
    todayOrdersChange: getChange(stats.todayOrders, stats.yesterdayOrders),
    pendingOrders: stats.pendingOrders,
    pendingOrdersChange: getChange(stats.pendingOrders, stats.yesterdayPendingOrders),
    completedOrders: stats.completedOrders,
    completedOrdersChange: getChange(stats.completedOrders, stats.yesterdayCompletedOrders),
    errorOrders: stats.errorOrders,
    errorOrdersChange: getChange(stats.errorOrders, stats.yesterdayErrorOrders),
  }
}

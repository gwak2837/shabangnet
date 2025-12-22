'use server'

import { desc, eq, sql } from 'drizzle-orm'
import ms from 'ms'

import { db } from '@/db/client'
import { manufacturer } from '@/db/schema/manufacturers'
import { order, orderEmailLog, orderEmailLogItem, upload } from '@/db/schema/orders'

// Dashboard types
export interface ChartDataItem {
  amount: number
  name: string
  orders: number
}

export interface DashboardStats {
  completedOrders: number
  errorOrders: number
  pendingOrders: number
  todayOrders: number
  todayPendingOrders: number
  yesterdayCompletedOrders: number
  yesterdayErrorOrders: number
  yesterdayOrders: number
  yesterdayPendingOrders: number
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
  const result = await db
    .select({
      id: upload.id,
      fileName: upload.fileName,
      fileSize: upload.fileSize,
      totalOrders: upload.totalOrders,
      processedOrders: upload.processedOrders,
      errorOrders: upload.errorOrders,
      status: upload.status,
      uploadedAt: upload.uploadedAt,
    })
    .from(upload)
    .orderBy(desc(upload.uploadedAt))
    .limit(5)

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
  const now = new Date()

  function getStartOfDayInKst(date: Date): Date {
    const kstOffsetMs = ms('9h')
    const kstDate = new Date(date.getTime() + kstOffsetMs)
    const year = kstDate.getUTCFullYear()
    const month = kstDate.getUTCMonth()
    const day = kstDate.getUTCDate()
    return new Date(Date.UTC(year, month, day) - kstOffsetMs)
  }

  const todayStart = getStartOfDayInKst(now)
  const yesterdayStart = new Date(todayStart.getTime() - ms('24h'))
  const yesterdayNow = new Date(now.getTime() - ms('24h'))

  // NOTE: postgres-js가 일부 환경에서 Date 파라미터를 직렬화하다가 실패할 수 있어요.
  // 안전하게 ISO 문자열로 넘기고 timestamptz로 캐스팅합니다.
  const nowIso = now.toISOString()
  const todayStartIso = todayStart.toISOString()
  const yesterdayStartIso = yesterdayStart.toISOString()
  const yesterdayNowIso = yesterdayNow.toISOString()

  const [orderStats] = await db
    .select({
      todayOrders:
        sql<number>`count(*) filter (where ${order.createdAt} >= ${todayStartIso}::timestamptz and ${order.createdAt} < ${nowIso}::timestamptz)`.mapWith(
          Number,
        ),
      yesterdayOrders:
        sql<number>`count(*) filter (where ${order.createdAt} >= ${yesterdayStartIso}::timestamptz and ${order.createdAt} < ${yesterdayNowIso}::timestamptz)`.mapWith(
          Number,
        ),
      pendingOrders: sql<number>`count(*) filter (where ${order.status} = 'pending')`.mapWith(Number),
      todayPendingOrders:
        sql<number>`count(*) filter (where ${order.createdAt} >= ${todayStartIso}::timestamptz and ${order.createdAt} < ${nowIso}::timestamptz and ${order.status} = 'pending')`.mapWith(
          Number,
        ),
      completedOrders:
        sql<number>`count(*) filter (where ${order.createdAt} >= ${todayStartIso}::timestamptz and ${order.createdAt} < ${nowIso}::timestamptz and ${order.status} = 'completed')`.mapWith(
          Number,
        ),
      yesterdayCompletedOrders:
        sql<number>`count(*) filter (where ${order.createdAt} >= ${yesterdayStartIso}::timestamptz and ${order.createdAt} < ${yesterdayNowIso}::timestamptz and ${order.status} = 'completed')`.mapWith(
          Number,
        ),
      errorOrders:
        sql<number>`count(*) filter (where ${order.createdAt} >= ${todayStartIso}::timestamptz and ${order.createdAt} < ${nowIso}::timestamptz and ${order.status} = 'error')`.mapWith(
          Number,
        ),
      yesterdayErrorOrders:
        sql<number>`count(*) filter (where ${order.createdAt} >= ${yesterdayStartIso}::timestamptz and ${order.createdAt} < ${yesterdayNowIso}::timestamptz and ${order.status} = 'error')`.mapWith(
          Number,
        ),
      totalOrdersBeforeYesterdayNow:
        sql<number>`count(*) filter (where ${order.createdAt} < ${yesterdayNowIso}::timestamptz)`.mapWith(Number),
    })
    .from(order)

  const logAt = sql<Date>`coalesce(${orderEmailLog.sentAt}, ${orderEmailLog.createdAt})`

  const [logStats] = await db
    .select({
      processedOrdersBeforeYesterdayNow:
        sql<number>`count(distinct ${orderEmailLogItem.sabangnetOrderNumber}) filter (where ${logAt} < ${yesterdayNowIso}::timestamptz)`.mapWith(
          Number,
        ),
    })
    .from(orderEmailLogItem)
    .innerJoin(orderEmailLog, eq(orderEmailLogItem.emailLogId, orderEmailLog.id))

  const totalOrdersBeforeYesterdayNow = orderStats?.totalOrdersBeforeYesterdayNow ?? 0
  const processedOrdersBeforeYesterdayNow = logStats?.processedOrdersBeforeYesterdayNow ?? 0
  const yesterdayPendingOrders = Math.max(0, totalOrdersBeforeYesterdayNow - processedOrdersBeforeYesterdayNow)

  return {
    todayOrders: orderStats?.todayOrders ?? 0,
    yesterdayOrders: orderStats?.yesterdayOrders ?? 0,
    pendingOrders: orderStats?.pendingOrders ?? 0,
    yesterdayPendingOrders,
    todayPendingOrders: orderStats?.todayPendingOrders ?? 0,
    completedOrders: orderStats?.completedOrders ?? 0,
    yesterdayCompletedOrders: orderStats?.yesterdayCompletedOrders ?? 0,
    errorOrders: orderStats?.errorOrders ?? 0,
    yesterdayErrorOrders: orderStats?.yesterdayErrorOrders ?? 0,
  }
}

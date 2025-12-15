'use server'

import { and, eq, isNull, sql } from 'drizzle-orm'

import { db } from '@/db/client'
import { invoiceTemplate, manufacturer, orderTemplate } from '@/db/schema/manufacturers'
import { order } from '@/db/schema/orders'

// Types moved to avoid 'use server' export restrictions
// These are re-exported for convenience but defined inline

interface InvoiceTemplate {
  courierColumn: string
  dataStartRow: number
  headerRow: number
  id: number
  manufacturerId: number
  manufacturerName: string
  orderNumberColumn: string
  trackingNumberColumn: string
  useColumnIndex: boolean
}

interface Manufacturer {
  ccEmail?: string
  contactName: string
  email: string | null
  id: number
  lastOrderDate: string
  name: string
  orderCount: number
  phone: string
}

// 발주서 템플릿 타입
interface OrderTemplate {
  columnMappings: Record<string, string> // 사방넷 key -> 발주서 컬럼 (A, B, C...)
  dataStartRow: number
  fixedValues?: Record<string, string> // 고정값 (컬럼 -> 값)
  headerRow: number
  id: number
  manufacturerId: number
  manufacturerName: string
  templateFileName?: string
}

// Export the type separately
export type { OrderTemplate }

const DEFAULT_INVOICE_TEMPLATE = {
  orderNumberColumn: 'A',
  courierColumn: 'B',
  trackingNumberColumn: 'C',
  headerRow: 1,
  dataStartRow: 2,
  useColumnIndex: true,
} as const

const DEFAULT_ORDER_TEMPLATE = {
  headerRow: 1,
  dataStartRow: 2,
  columnMappings: {
    sabangnetOrderNumber: 'A',
    recipientName: 'B',
    recipientMobile: 'C',
    address: 'D',
    productName: 'E',
    optionName: 'F',
    quantity: 'G',
    paymentAmount: 'H',
    memo: 'I',
  },
} as const

export async function create(data: Omit<Manufacturer, 'id' | 'lastOrderDate' | 'orderCount'>): Promise<Manufacturer> {
  const [newManufacturer] = await db
    .insert(manufacturer)
    .values({
      name: data.name,
      contactName: data.contactName,
      email: data.email,
      ccEmail: data.ccEmail,
      phone: data.phone,
      orderCount: 0,
    })
    .returning()

  // 제조사명이 파일 데이터와 동일하면 기존 주문에도 자동 반영
  await db
    .update(order)
    .set({
      manufacturerId: newManufacturer.id,
    })
    .where(
      and(
        isNull(order.manufacturerId),
        isNull(order.excludedReason),
        sql`lower(${order.manufacturerName}) = lower(${newManufacturer.name})`,
      ),
    )

  return mapToManufacturer(newManufacturer)
}

export async function deleteOrderTemplate(manufacturerId: number): Promise<void> {
  await db.delete(orderTemplate).where(eq(orderTemplate.manufacturerId, manufacturerId))
}

export async function getAll(): Promise<Manufacturer[]> {
  const result = await db.select().from(manufacturer).orderBy(manufacturer.name)
  return result.map(mapToManufacturer)
}

export async function getById(id: number): Promise<Manufacturer | undefined> {
  const [result] = await db.select().from(manufacturer).where(eq(manufacturer.id, id))
  if (!result) return undefined
  return mapToManufacturer(result)
}

export async function getInvoiceTemplate(manufacturerId: number): Promise<InvoiceTemplate | null> {
  const [template] = await db.select().from(invoiceTemplate).where(eq(invoiceTemplate.manufacturerId, manufacturerId))

  if (!template) return null

  const mfr = await getById(manufacturerId)
  if (!mfr) throw new Error('Manufacturer not found')

  return mapToInvoiceTemplate(template, mfr.name)
}

export async function getInvoiceTemplateOrDefault(manufacturerId: number): Promise<InvoiceTemplate> {
  const customTemplate = await getInvoiceTemplate(manufacturerId)
  if (customTemplate) return customTemplate

  const mfr = await getById(manufacturerId)
  return {
    id: 0,
    manufacturerId,
    manufacturerName: mfr?.name || '알 수 없음',
    ...DEFAULT_INVOICE_TEMPLATE,
  }
}

export async function getOrderTemplate(manufacturerId: number): Promise<OrderTemplate | null> {
  const [template] = await db.select().from(orderTemplate).where(eq(orderTemplate.manufacturerId, manufacturerId))

  if (!template) return null

  const mfr = await getById(manufacturerId)
  if (!mfr) throw new Error('Manufacturer not found')

  return mapToOrderTemplate(template, mfr.name)
}

export async function getOrderTemplateOrDefault(manufacturerId: number): Promise<OrderTemplate> {
  const customTemplate = await getOrderTemplate(manufacturerId)
  if (customTemplate) return customTemplate

  const mfr = await getById(manufacturerId)
  return {
    id: 0,
    manufacturerId,
    manufacturerName: mfr?.name || '알 수 없음',
    ...DEFAULT_ORDER_TEMPLATE,
  }
}

export async function remove(id: number): Promise<void> {
  await db.delete(manufacturer).where(eq(manufacturer.id, id))
}

export async function update(id: number, data: Partial<Manufacturer>): Promise<Manufacturer> {
  const [updated] = await db
    .update(manufacturer)
    .set({
      name: data.name,
      contactName: data.contactName,
      email: data.email,
      ccEmail: data.ccEmail,
      phone: data.phone,
      updatedAt: new Date(),
    })
    .where(eq(manufacturer.id, id))
    .returning()

  if (!updated) throw new Error('Manufacturer not found')

  // 제조사명이 파일 데이터와 동일하면 기존 주문에도 자동 반영
  if (updated.name) {
    await db
      .update(order)
      .set({
        manufacturerId: updated.id,
      })
      .where(
        and(
          isNull(order.manufacturerId),
          isNull(order.excludedReason),
          sql`lower(${order.manufacturerName}) = lower(${updated.name})`,
        ),
      )
  }

  return mapToManufacturer(updated)
}

export async function updateInvoiceTemplate(
  manufacturerId: number,
  template: InvoiceTemplate,
): Promise<InvoiceTemplate> {
  const existing = await getInvoiceTemplate(manufacturerId)

  if (existing) {
    const [updated] = await db
      .update(invoiceTemplate)
      .set({
        orderNumberColumn: template.orderNumberColumn,
        courierColumn: template.courierColumn,
        trackingNumberColumn: template.trackingNumberColumn,
        headerRow: template.headerRow,
        dataStartRow: template.dataStartRow,
        useColumnIndex: template.useColumnIndex,
        updatedAt: new Date(),
      })
      .where(eq(invoiceTemplate.manufacturerId, manufacturerId))
      .returning()
    return mapToInvoiceTemplate(updated, template.manufacturerName)
  } else {
    const [created] = await db
      .insert(invoiceTemplate)
      .values({
        manufacturerId,
        orderNumberColumn: template.orderNumberColumn,
        courierColumn: template.courierColumn,
        trackingNumberColumn: template.trackingNumberColumn,
        headerRow: template.headerRow,
        dataStartRow: template.dataStartRow,
        useColumnIndex: template.useColumnIndex,
      })
      .returning()
    return mapToInvoiceTemplate(created, template.manufacturerName)
  }
}

export async function updateOrderTemplate(
  manufacturerId: number,
  template: Omit<OrderTemplate, 'id' | 'manufacturerId' | 'manufacturerName'> & { templateFileBuffer?: ArrayBuffer },
): Promise<OrderTemplate> {
  const existing = await getOrderTemplate(manufacturerId)
  const mfr = await getById(manufacturerId)

  if (!mfr) throw new Error('Manufacturer not found')

  const templateFileSet = template.templateFileBuffer
    ? { templateFile: Buffer.from(new Uint8Array(template.templateFileBuffer)) }
    : {}

  if (existing) {
    const [updated] = await db
      .update(orderTemplate)
      .set({
        templateFileName: template.templateFileName || null,
        ...templateFileSet,
        headerRow: template.headerRow,
        dataStartRow: template.dataStartRow,
        columnMappings: JSON.stringify(template.columnMappings),
        fixedValues: template.fixedValues ? JSON.stringify(template.fixedValues) : null,
        updatedAt: new Date(),
      })
      .where(eq(orderTemplate.manufacturerId, manufacturerId))
      .returning()
    return mapToOrderTemplate(updated, mfr.name)
  } else {
    const [created] = await db
      .insert(orderTemplate)
      .values({
        manufacturerId,
        templateFileName: template.templateFileName || null,
        ...templateFileSet,
        headerRow: template.headerRow,
        dataStartRow: template.dataStartRow,
        columnMappings: JSON.stringify(template.columnMappings),
        fixedValues: template.fixedValues ? JSON.stringify(template.fixedValues) : null,
      })
      .returning()
    return mapToOrderTemplate(created, mfr.name)
  }
}

// Helper to convert DB invoice template to App InvoiceTemplate
function mapToInvoiceTemplate(t: typeof invoiceTemplate.$inferSelect, manufacturerName: string): InvoiceTemplate {
  return {
    id: t.id,
    manufacturerId: t.manufacturerId,
    manufacturerName,
    orderNumberColumn: t.orderNumberColumn,
    courierColumn: t.courierColumn,
    trackingNumberColumn: t.trackingNumberColumn,
    headerRow: t.headerRow || 1,
    dataStartRow: t.dataStartRow || 2,
    useColumnIndex: t.useColumnIndex ?? true,
  }
}

// Helper to convert DB manufacturer to App Manufacturer
function mapToManufacturer(
  m: typeof manufacturer.$inferSelect & {
    invoiceTemplate?: typeof invoiceTemplate.$inferSelect
  },
): Manufacturer {
  return {
    id: m.id,
    name: m.name,
    contactName: m.contactName || '',
    email: m.email ?? null,
    ccEmail: m.ccEmail || undefined,
    phone: m.phone || '',
    orderCount: m.orderCount || 0,
    lastOrderDate: m.lastOrderDate ? m.lastOrderDate.toISOString().split('T')[0] : '',
  }
}

// Helper to convert DB order template to App OrderTemplate
function mapToOrderTemplate(t: typeof orderTemplate.$inferSelect, manufacturerName: string): OrderTemplate {
  let columnMappings: Record<string, string> = {}
  let fixedValues: Record<string, string> | undefined

  try {
    if (t.columnMappings) {
      columnMappings =
        typeof t.columnMappings === 'string'
          ? (JSON.parse(t.columnMappings) as Record<string, string>)
          : (t.columnMappings as Record<string, string>)
    }
    if (t.fixedValues) {
      fixedValues =
        typeof t.fixedValues === 'string'
          ? (JSON.parse(t.fixedValues) as Record<string, string>)
          : (t.fixedValues as Record<string, string>)
    }
  } catch {
    // JSON 파싱 실패 시 기본값 사용
    columnMappings = {}
  }

  return {
    id: t.id,
    manufacturerId: t.manufacturerId,
    manufacturerName,
    templateFileName: t.templateFileName || undefined,
    headerRow: t.headerRow || 1,
    dataStartRow: t.dataStartRow || 2,
    columnMappings,
    fixedValues,
  }
}

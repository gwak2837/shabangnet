'use server'

import { eq } from 'drizzle-orm'

import { db } from '@/db/client'
import { invoiceTemplates, manufacturers, orderTemplates } from '@/db/schema/manufacturers'

// Types moved to avoid 'use server' export restrictions
// These are re-exported for convenience but defined inline

interface InvoiceTemplate {
  courierColumn: string
  dataStartRow: number
  headerRow: number
  id: string
  manufacturerId: string
  manufacturerName: string
  orderNumberColumn: string
  trackingNumberColumn: string
  useColumnIndex: boolean
}

interface Manufacturer {
  ccEmail?: string
  contactName: string
  email: string
  id: string
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
  id: string
  manufacturerId: string
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
    orderNumber: 'A',
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
    .insert(manufacturers)
    .values({
      id: `m${Date.now()}`,
      name: data.name,
      contactName: data.contactName,
      email: data.email,
      ccEmail: data.ccEmail,
      phone: data.phone,
      orderCount: 0,
    })
    .returning()

  return mapToManufacturer(newManufacturer)
}

export async function deleteOrderTemplate(manufacturerId: string): Promise<void> {
  await db.delete(orderTemplates).where(eq(orderTemplates.manufacturerId, manufacturerId))
}

export async function getAll(): Promise<Manufacturer[]> {
  const result = await db.select().from(manufacturers).orderBy(manufacturers.name)
  return result.map(mapToManufacturer)
}

export async function getById(id: string): Promise<Manufacturer | undefined> {
  const [result] = await db.select().from(manufacturers).where(eq(manufacturers.id, id))
  if (!result) return undefined
  return mapToManufacturer(result)
}

export async function getInvoiceTemplate(manufacturerId: string): Promise<InvoiceTemplate | null> {
  const [template] = await db.select().from(invoiceTemplates).where(eq(invoiceTemplates.manufacturerId, manufacturerId))

  if (!template) return null

  const manufacturer = await getById(manufacturerId)
  if (!manufacturer) throw new Error('Manufacturer not found')

  return mapToInvoiceTemplate(template, manufacturer.name)
}

export async function getInvoiceTemplateOrDefault(manufacturerId: string): Promise<InvoiceTemplate> {
  const customTemplate = await getInvoiceTemplate(manufacturerId)
  if (customTemplate) return customTemplate

  const manufacturer = await getById(manufacturerId)
  return {
    id: 'default',
    manufacturerId,
    manufacturerName: manufacturer?.name || '알 수 없음',
    ...DEFAULT_INVOICE_TEMPLATE,
  }
}

export async function getOrderTemplate(manufacturerId: string): Promise<OrderTemplate | null> {
  const [template] = await db.select().from(orderTemplates).where(eq(orderTemplates.manufacturerId, manufacturerId))

  if (!template) return null

  const manufacturer = await getById(manufacturerId)
  if (!manufacturer) throw new Error('Manufacturer not found')

  return mapToOrderTemplate(template, manufacturer.name)
}

export async function getOrderTemplateOrDefault(manufacturerId: string): Promise<OrderTemplate> {
  const customTemplate = await getOrderTemplate(manufacturerId)
  if (customTemplate) return customTemplate

  const manufacturer = await getById(manufacturerId)
  return {
    id: 'default',
    manufacturerId,
    manufacturerName: manufacturer?.name || '알 수 없음',
    ...DEFAULT_ORDER_TEMPLATE,
  }
}

export async function remove(id: string): Promise<void> {
  await db.delete(manufacturers).where(eq(manufacturers.id, id))
}

export async function update(id: string, data: Partial<Manufacturer>): Promise<Manufacturer> {
  const [updated] = await db
    .update(manufacturers)
    .set({
      name: data.name,
      contactName: data.contactName,
      email: data.email,
      ccEmail: data.ccEmail,
      phone: data.phone,
      updatedAt: new Date(),
    })
    .where(eq(manufacturers.id, id))
    .returning()

  if (!updated) throw new Error('Manufacturer not found')
  return mapToManufacturer(updated)
}

export async function updateInvoiceTemplate(
  manufacturerId: string,
  template: InvoiceTemplate,
): Promise<InvoiceTemplate> {
  const existing = await getInvoiceTemplate(manufacturerId)

  if (existing) {
    const [updated] = await db
      .update(invoiceTemplates)
      .set({
        orderNumberColumn: template.orderNumberColumn,
        courierColumn: template.courierColumn,
        trackingNumberColumn: template.trackingNumberColumn,
        headerRow: template.headerRow,
        dataStartRow: template.dataStartRow,
        useColumnIndex: template.useColumnIndex,
        updatedAt: new Date(),
      })
      .where(eq(invoiceTemplates.manufacturerId, manufacturerId))
      .returning()
    return mapToInvoiceTemplate(updated, template.manufacturerName)
  } else {
    const [created] = await db
      .insert(invoiceTemplates)
      .values({
        id: `it${Date.now()}`,
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
  manufacturerId: string,
  template: Omit<OrderTemplate, 'id' | 'manufacturerId' | 'manufacturerName'>,
): Promise<OrderTemplate> {
  const existing = await getOrderTemplate(manufacturerId)
  const manufacturer = await getById(manufacturerId)

  if (!manufacturer) throw new Error('Manufacturer not found')

  if (existing) {
    const [updated] = await db
      .update(orderTemplates)
      .set({
        templateFileName: template.templateFileName || null,
        headerRow: template.headerRow,
        dataStartRow: template.dataStartRow,
        columnMappings: JSON.stringify(template.columnMappings),
        fixedValues: template.fixedValues ? JSON.stringify(template.fixedValues) : null,
        updatedAt: new Date(),
      })
      .where(eq(orderTemplates.manufacturerId, manufacturerId))
      .returning()
    return mapToOrderTemplate(updated, manufacturer.name)
  } else {
    const [created] = await db
      .insert(orderTemplates)
      .values({
        id: `ot${Date.now()}`,
        manufacturerId,
        templateFileName: template.templateFileName || null,
        headerRow: template.headerRow,
        dataStartRow: template.dataStartRow,
        columnMappings: JSON.stringify(template.columnMappings),
        fixedValues: template.fixedValues ? JSON.stringify(template.fixedValues) : null,
      })
      .returning()
    return mapToOrderTemplate(created, manufacturer.name)
  }
}

// Helper to convert DB invoice template to App InvoiceTemplate
function mapToInvoiceTemplate(t: typeof invoiceTemplates.$inferSelect, manufacturerName: string): InvoiceTemplate {
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
  m: typeof manufacturers.$inferSelect & {
    invoiceTemplate?: typeof invoiceTemplates.$inferSelect
  },
): Manufacturer {
  return {
    id: m.id,
    name: m.name,
    contactName: m.contactName || '',
    email: m.email,
    ccEmail: m.ccEmail || undefined,
    phone: m.phone || '',
    orderCount: m.orderCount || 0,
    lastOrderDate: m.lastOrderDate ? m.lastOrderDate.toISOString().split('T')[0] : '',
  }
}

// Helper to convert DB order template to App OrderTemplate
function mapToOrderTemplate(t: typeof orderTemplates.$inferSelect, manufacturerName: string): OrderTemplate {
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

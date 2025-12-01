'use server'

import { eq } from 'drizzle-orm'

import { db } from '@/db/client'
import { invoiceTemplates, manufacturers } from '@/db/schema/manufacturers'

export interface InvoiceTemplate {
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

// Manufacturer types
export interface Manufacturer {
  ccEmail?: string
  contactName: string
  email: string
  id: string
  lastOrderDate: string
  name: string
  orderCount: number
  phone: string
}

export const defaultInvoiceTemplate: Omit<InvoiceTemplate, 'id' | 'manufacturerId' | 'manufacturerName'> = {
  orderNumberColumn: 'A',
  courierColumn: 'B',
  trackingNumberColumn: 'C',
  headerRow: 1,
  dataStartRow: 2,
  useColumnIndex: true,
}

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
  const [template] = await db
    .select()
    .from(invoiceTemplates)
    .where(eq(invoiceTemplates.manufacturerId, manufacturerId))

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
    ...defaultInvoiceTemplate,
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

// Helper to convert DB invoice template to App InvoiceTemplate
function mapToInvoiceTemplate(
  t: typeof invoiceTemplates.$inferSelect,
  manufacturerName: string,
): InvoiceTemplate {
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

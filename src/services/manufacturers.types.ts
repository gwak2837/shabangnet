// Types and constants for manufacturers service
// Separated from the 'use server' file due to Next.js restrictions

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

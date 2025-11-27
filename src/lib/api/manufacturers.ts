import { manufacturers as mockManufacturers, type Manufacturer, type InvoiceTemplate } from '@/lib/mock-data'

// 메모리에 데이터 복사 (CRUD 시뮬레이션용)
let manufacturersData = [...mockManufacturers]

// API 지연 시뮬레이션
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function getAll(): Promise<Manufacturer[]> {
  await delay(300)
  return manufacturersData
}

export async function getById(id: string): Promise<Manufacturer | undefined> {
  await delay(200)
  return manufacturersData.find((m) => m.id === id)
}

export async function create(data: Omit<Manufacturer, 'id' | 'orderCount' | 'lastOrderDate'>): Promise<Manufacturer> {
  await delay(500)
  const newManufacturer: Manufacturer = {
    ...data,
    id: `m${Date.now()}`,
    orderCount: 0,
    lastOrderDate: new Date().toISOString().split('T')[0],
  }
  manufacturersData = [newManufacturer, ...manufacturersData]
  return newManufacturer
}

export async function update(id: string, data: Partial<Manufacturer>): Promise<Manufacturer> {
  await delay(500)
  const index = manufacturersData.findIndex((m) => m.id === id)
  if (index === -1) throw new Error('Manufacturer not found')

  manufacturersData[index] = { ...manufacturersData[index], ...data }
  return manufacturersData[index]
}

export async function remove(id: string): Promise<void> {
  await delay(300)
  manufacturersData = manufacturersData.filter((m) => m.id !== id)
}

// Invoice Template 관련 (향후 확장용)
export async function getInvoiceTemplate(manufacturerId: string): Promise<InvoiceTemplate | null> {
  await delay(200)
  // 현재는 mock 데이터에서 가져오지만, 나중에 실제 API로 교체
  return null
}

export async function updateInvoiceTemplate(
  manufacturerId: string,
  template: InvoiceTemplate,
): Promise<InvoiceTemplate> {
  await delay(500)
  return template
}

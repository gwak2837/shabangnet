import { products as mockProducts, type Product } from '@/lib/mock-data'

// 메모리에 데이터 복사 (CRUD 시뮬레이션용)
let productsData = [...mockProducts]

// API 지연 시뮬레이션
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function getAll(): Promise<Product[]> {
  await delay(300)
  return productsData
}

export async function getById(id: string): Promise<Product | undefined> {
  await delay(200)
  return productsData.find((p) => p.id === id)
}

export async function create(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
  await delay(500)
  const now = new Date().toISOString()
  const newProduct: Product = {
    ...data,
    id: `p${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  }
  productsData = [newProduct, ...productsData]
  return newProduct
}

export async function update(id: string, data: Partial<Product>): Promise<Product> {
  await delay(500)
  const index = productsData.findIndex((p) => p.id === id)
  if (index === -1) throw new Error('Product not found')

  productsData[index] = {
    ...productsData[index],
    ...data,
    updatedAt: new Date().toISOString(),
  }
  return productsData[index]
}

export async function remove(id: string): Promise<void> {
  await delay(300)
  productsData = productsData.filter((p) => p.id !== id)
}


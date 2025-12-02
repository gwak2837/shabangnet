'use server'

import { eq } from 'drizzle-orm'

import { db } from '@/db/client'
import { manufacturers, products } from '@/db/schema/manufacturers'

// Product types
export interface Product {
  cost: number
  createdAt: string
  id: string
  manufacturerId: string | null
  manufacturerName: string | null
  optionName: string
  price: number
  productCode: string
  productName: string
  updatedAt: string
}

export async function create(data: Omit<Product, 'createdAt' | 'id' | 'updatedAt'>): Promise<Product> {
  const [newProduct] = await db
    .insert(products)
    .values({
      id: `p${Date.now()}`,
      productCode: data.productCode,
      productName: data.productName,
      optionName: data.optionName,
      manufacturerId: data.manufacturerId,
      price: data.price.toString(),
      cost: data.cost.toString(),
    })
    .returning()

  const manufacturer = data.manufacturerId
    ? await db.query.manufacturers.findFirst({
        where: eq(manufacturers.id, data.manufacturerId),
      })
    : null

  return mapToProduct({ ...newProduct, manufacturer })
}

export async function getAll(): Promise<Product[]> {
  const result = await db.query.products.findMany({
    with: {
      manufacturer: true,
    },
    orderBy: (products, { desc }) => [desc(products.createdAt)],
  })

  return result.map(mapToProduct)
}

export async function getById(id: string): Promise<Product | undefined> {
  const result = await db.query.products.findFirst({
    where: eq(products.id, id),
    with: {
      manufacturer: true,
    },
  })

  if (!result) return undefined
  return mapToProduct(result)
}

export async function remove(id: string): Promise<void> {
  await db.delete(products).where(eq(products.id, id))
}

export async function update(id: string, data: Partial<Product>): Promise<Product> {
  const [updated] = await db
    .update(products)
    .set({
      productCode: data.productCode,
      productName: data.productName,
      optionName: data.optionName,
      manufacturerId: data.manufacturerId,
      price: data.price?.toString(),
      cost: data.cost?.toString(),
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))
    .returning()

  if (!updated) throw new Error('Product not found')

  const manufacturer = updated.manufacturerId
    ? await db.query.manufacturers.findFirst({
        where: eq(manufacturers.id, updated.manufacturerId),
      })
    : null

  return mapToProduct({ ...updated, manufacturer })
}

function mapToProduct(
  p: typeof products.$inferSelect & {
    manufacturer?: typeof manufacturers.$inferSelect | null
  },
): Product {
  return {
    id: p.id,
    productCode: p.productCode,
    productName: p.productName,
    optionName: p.optionName || '',
    manufacturerId: p.manufacturerId,
    manufacturerName: p.manufacturer?.name || null,
    price: Number(p.price),
    cost: Number(p.cost),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }
}

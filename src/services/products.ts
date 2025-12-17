'use server'

import { and, eq, isNull, sql } from 'drizzle-orm'

import { db } from '@/db/client'
import { manufacturer, product } from '@/db/schema/manufacturers'
import { order } from '@/db/schema/orders'

export interface Product {
  cost: number
  createdAt: string
  id: number
  manufacturerId: number | null
  manufacturerName: string | null
  optionName: string
  price: number
  productCode: string
  productName: string
  shippingFee: number
  updatedAt: string
}

export async function create(data: Omit<Product, 'createdAt' | 'id' | 'updatedAt'>): Promise<Product> {
  const [newProduct] = await db
    .insert(product)
    .values({
      productCode: data.productCode,
      productName: data.productName,
      optionName: data.optionName,
      manufacturerId: data.manufacturerId,
      price: data.price,
      cost: data.cost,
      shippingFee: data.shippingFee,
    })
    .returning()

  const mfr = data.manufacturerId
    ? await db.query.manufacturer.findFirst({
        where: eq(manufacturer.id, data.manufacturerId),
      })
    : null

  // 기존 주문 중 제조사 미연결 건에 자동 반영
  if (data.manufacturerId) {
    await db
      .update(order)
      .set({
        manufacturerId: data.manufacturerId,
        manufacturerName: mfr?.name ?? null,
      })
      .where(
        and(
          isNull(order.manufacturerId),
          isNull(order.excludedReason),
          sql`lower(trim(${order.productCode})) = lower(trim(${data.productCode}))`,
          sql`${order.status} <> 'completed'`,
        ),
      )
  }

  return mapToProduct({ ...newProduct, manufacturer: mfr })
}

export async function getAll(): Promise<Product[]> {
  const result = await db.query.product.findMany({
    with: {
      manufacturer: true,
    },
    orderBy: (product, { desc }) => [desc(product.createdAt)],
  })

  return result.map(mapToProduct)
}

export async function getById(id: number): Promise<Product | undefined> {
  const result = await db.query.product.findFirst({
    where: eq(product.id, id),
    with: {
      manufacturer: true,
    },
  })

  if (!result) return undefined
  return mapToProduct(result)
}

export async function remove(id: number): Promise<void> {
  await db.delete(product).where(eq(product.id, id))
}

export async function update(id: number, data: Partial<Product>): Promise<Product> {
  const [updated] = await db
    .update(product)
    .set({
      productCode: data.productCode,
      productName: data.productName,
      optionName: data.optionName,
      manufacturerId: data.manufacturerId,
      price: data.price,
      cost: data.cost,
      shippingFee: data.shippingFee,
      updatedAt: new Date(),
    })
    .where(eq(product.id, id))
    .returning()

  if (!updated) throw new Error('Product not found')

  const mfr = updated.manufacturerId
    ? await db.query.manufacturer.findFirst({
        where: eq(manufacturer.id, updated.manufacturerId),
      })
    : null

  // 기존 주문 중 제조사 미연결 건에 자동 반영
  if (updated.manufacturerId) {
    await db
      .update(order)
      .set({
        manufacturerId: updated.manufacturerId,
        manufacturerName: mfr?.name ?? null,
      })
      .where(
        and(
          isNull(order.manufacturerId),
          isNull(order.excludedReason),
          sql`lower(trim(${order.productCode})) = lower(trim(${updated.productCode}))`,
          sql`${order.status} <> 'completed'`,
        ),
      )
  }

  return mapToProduct({ ...updated, manufacturer: mfr })
}

function mapToProduct(
  p: typeof product.$inferSelect & {
    manufacturer?: typeof manufacturer.$inferSelect | null
  },
): Product {
  return {
    id: p.id,
    productCode: p.productCode,
    productName: p.productName,
    optionName: p.optionName || '',
    manufacturerId: p.manufacturerId,
    manufacturerName: p.manufacturer?.name || null,
    price: p.price ?? 0,
    cost: p.cost ?? 0,
    shippingFee: p.shippingFee ?? 0,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }
}

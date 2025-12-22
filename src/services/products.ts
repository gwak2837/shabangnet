'use server'

import { and, desc, eq, isNull, sql } from 'drizzle-orm'

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

  const [mfr] =
    data.manufacturerId != null
      ? await db.select({ name: manufacturer.name }).from(manufacturer).where(eq(manufacturer.id, data.manufacturerId))
      : [null]

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
          sql`lower(trim(${order.productCode})) = lower(trim(${data.productCode}))`,
          sql`${order.status} <> 'completed'`,
        ),
      )
  }

  return mapToProductRow({ ...newProduct, manufacturerName: mfr?.name ?? null })
}

export async function getAll(): Promise<Product[]> {
  const rows = await db
    .select({
      id: product.id,
      productCode: product.productCode,
      productName: product.productName,
      optionName: product.optionName,
      manufacturerId: product.manufacturerId,
      manufacturerName: manufacturer.name,
      price: product.price,
      cost: product.cost,
      shippingFee: product.shippingFee,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    })
    .from(product)
    .leftJoin(manufacturer, eq(product.manufacturerId, manufacturer.id))
    .orderBy(desc(product.createdAt))

  return rows.map(mapToProductRow)
}

export async function getById(id: number): Promise<Product | undefined> {
  const [row] = await db
    .select({
      id: product.id,
      productCode: product.productCode,
      productName: product.productName,
      optionName: product.optionName,
      manufacturerId: product.manufacturerId,
      manufacturerName: manufacturer.name,
      price: product.price,
      cost: product.cost,
      shippingFee: product.shippingFee,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    })
    .from(product)
    .leftJoin(manufacturer, eq(product.manufacturerId, manufacturer.id))
    .where(eq(product.id, id))

  if (!row) return undefined
  return mapToProductRow(row)
}

export async function remove(id: number): Promise<void> {
  await db.delete(product).where(eq(product.id, id))
}

function mapToProductRow(p: {
  cost: number | null
  createdAt: Date
  id: number
  manufacturerId: number | null
  manufacturerName: string | null
  optionName: string | null
  price: number | null
  productCode: string
  productName: string
  shippingFee: number | null
  updatedAt: Date
}): Product {
  return {
    id: p.id,
    productCode: p.productCode,
    productName: p.productName,
    optionName: p.optionName || '',
    manufacturerId: p.manufacturerId,
    manufacturerName: p.manufacturerName ?? null,
    price: p.price ?? 0,
    cost: p.cost ?? 0,
    shippingFee: p.shippingFee ?? 0,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }
}

'use server'

import { desc, eq } from 'drizzle-orm'

import { db } from '@/db/client'
import { manufacturer, optionMapping } from '@/db/schema/manufacturers'
import { normalizeOptionName } from '@/utils/normalize-option-name'

// Option mapping types
export interface OptionManufacturerMapping {
  createdAt: string
  id: number
  manufacturerId: number | null
  manufacturerName: string | null
  optionName: string
  productCode: string
  updatedAt: string
}

export async function create(
  data: Omit<OptionManufacturerMapping, 'createdAt' | 'id' | 'updatedAt'>,
): Promise<OptionManufacturerMapping> {
  if (data.manufacturerId == null) {
    throw new Error('제조사를 선택해 주세요')
  }

  const productCode = data.productCode.trim()
  if (!productCode) {
    throw new Error('상품코드가 비어 있어요')
  }

  const optionName = normalizeOptionName(data.optionName)
  if (!optionName) {
    throw new Error('옵션명이 비어 있어요')
  }

  const now = new Date()
  const [newMapping] = await db
    .insert(optionMapping)
    .values({
      productCode,
      optionName,
      manufacturerId: data.manufacturerId,
    })
    .onConflictDoUpdate({
      target: [optionMapping.productCode, optionMapping.optionName],
      set: { manufacturerId: data.manufacturerId, updatedAt: now },
    })
    .returning()

  const [mfr] = await db
    .select({ name: manufacturer.name })
    .from(manufacturer)
    .where(eq(manufacturer.id, data.manufacturerId))

  return mapToOptionMappingRow({ ...newMapping, manufacturerName: mfr?.name ?? null })
}

export async function getAll(): Promise<OptionManufacturerMapping[]> {
  const rows = await db
    .select({
      id: optionMapping.id,
      productCode: optionMapping.productCode,
      optionName: optionMapping.optionName,
      manufacturerId: optionMapping.manufacturerId,
      manufacturerName: manufacturer.name,
      createdAt: optionMapping.createdAt,
      updatedAt: optionMapping.updatedAt,
    })
    .from(optionMapping)
    .leftJoin(manufacturer, eq(optionMapping.manufacturerId, manufacturer.id))
    .orderBy(desc(optionMapping.createdAt))

  return rows.map(mapToOptionMappingRow)
}

export async function getById(id: number): Promise<OptionManufacturerMapping | undefined> {
  const [row] = await db
    .select({
      id: optionMapping.id,
      productCode: optionMapping.productCode,
      optionName: optionMapping.optionName,
      manufacturerId: optionMapping.manufacturerId,
      manufacturerName: manufacturer.name,
      createdAt: optionMapping.createdAt,
      updatedAt: optionMapping.updatedAt,
    })
    .from(optionMapping)
    .leftJoin(manufacturer, eq(optionMapping.manufacturerId, manufacturer.id))
    .where(eq(optionMapping.id, id))

  if (!row) return undefined
  return mapToOptionMappingRow(row)
}

export async function remove(id: number): Promise<void> {
  // 정책: 옵션 연결은 "업로드 시점"에만 적용해요.
  // 삭제해도 기존 주문 데이터는 변경하지 않아요. (앞으로 업로드되는 주문부터 반영돼요)
  await db.delete(optionMapping).where(eq(optionMapping.id, id))
}

export async function update(
  id: number,
  data: Partial<Omit<OptionManufacturerMapping, 'createdAt' | 'id'>>,
): Promise<OptionManufacturerMapping> {
  const nextOptionName = typeof data.optionName === 'string' ? normalizeOptionName(data.optionName) : data.optionName
  const [updated] = await db
    .update(optionMapping)
    .set({
      productCode: data.productCode,
      optionName: nextOptionName,
      manufacturerId: data.manufacturerId,
      updatedAt: new Date(),
    })
    .where(eq(optionMapping.id, id))
    .returning()

  if (!updated) throw new Error('Mapping not found')

  const [mfr] =
    updated.manufacturerId != null
      ? await db
          .select({ name: manufacturer.name })
          .from(manufacturer)
          .where(eq(manufacturer.id, updated.manufacturerId))
      : [null]

  return mapToOptionMappingRow({ ...updated, manufacturerName: mfr?.name ?? null })
}

function mapToOptionMappingRow(m: {
  createdAt: Date
  id: number
  manufacturerId: number | null
  manufacturerName: string | null
  optionName: string
  productCode: string
  updatedAt: Date
}): OptionManufacturerMapping {
  return {
    id: m.id,
    productCode: m.productCode,
    optionName: m.optionName,
    manufacturerId: m.manufacturerId,
    manufacturerName: m.manufacturerName ?? null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }
}

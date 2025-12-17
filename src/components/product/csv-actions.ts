'use server'

import { and, eq, isNull, sql } from 'drizzle-orm'

import { db } from '@/db/client'
import { manufacturer, product } from '@/db/schema/manufacturers'
import { order } from '@/db/schema/orders'
import { parseCsv } from '@/utils/csv'

import type { ProductCsvImportResult, ProductCsvRowError } from './product-csv.types'

type CanonicalField = 'cost' | 'manufacturerName' | 'optionName' | 'price' | 'productCode' | 'productName' | 'shippingFee'

export async function importProductsCsv(
  _prevState: ProductCsvImportResult | null,
  formData: FormData,
): Promise<ProductCsvImportResult> {
  try {
    const fileValue = formData.get('file')
    if (!isFileValue(fileValue)) {
      return { error: 'CSV 파일을 선택해 주세요.' }
    }

    if (fileValue.size === 0) {
      return { error: '빈 파일이에요.' }
    }

    const rawText = await fileValue.text()
    const rows = parseCsv(rawText)

    const headerRowIndex = rows.findIndex((row) => row.some((cell) => cell.trim() !== ''))
    if (headerRowIndex < 0) {
      return { error: 'CSV에 헤더가 없어요.' }
    }

    const headerRow = rows[headerRowIndex]!.map(normalizeHeaderCell)
    const dataRows = rows.slice(headerRowIndex + 1)

    const indexByField = new Map<CanonicalField, number>()
    for (let i = 0; i < headerRow.length; i += 1) {
      const field = headerToCanonicalField(headerRow[i] ?? '')
      if (!field) continue
      if (indexByField.has(field)) continue
      indexByField.set(field, i)
    }

    const productCodeIndex = indexByField.get('productCode')
    if (productCodeIndex == null) {
      return { error: '헤더에 상품코드가 필요해요. (예: 상품코드 또는 productCode)' }
    }

    const manufacturers = await db
      .select({
        id: manufacturer.id,
        name: manufacturer.name,
      })
      .from(manufacturer)

    const manufacturerIdByName = new Map<string, number>()
    const manufacturerNameById = new Map<number, string>()
    for (const m of manufacturers) {
      const name = normalizeName(m.name)
      manufacturerIdByName.set(name, m.id)
      manufacturerNameById.set(m.id, m.name)
    }

    const existingProducts = await db
      .select({
        id: product.id,
        manufacturerId: product.manufacturerId,
        productCode: product.productCode,
      })
      .from(product)

    const existingByCode = new Map<string, { id: number; manufacturerId: number | null; rawCode: string }>()
    for (const p of existingProducts) {
      const normalized = normalizeProductCode(p.productCode)
      if (!normalized) continue
      existingByCode.set(normalized, { id: p.id, manufacturerId: p.manufacturerId ?? null, rawCode: p.productCode })
    }

    const errors: ProductCsvRowError[] = []
    const seenInputCodes = new Set<string>()

    let totalRows = 0
    let created = 0
    let updated = 0
    let skipped = 0

    for (let i = 0; i < dataRows.length; i += 1) {
      const row = dataRows[i] ?? []
      const rowNumber = headerRowIndex + 2 + i

      const isEmptyRow = row.every((cell) => cell.trim() === '')
      if (isEmptyRow) {
        continue
      }

      totalRows += 1

      const rawProductCode = getCell(row, productCodeIndex)
      const normalizedCode = normalizeProductCode(rawProductCode)
      if (!normalizedCode) {
        skipped += 1
        errors.push({ row: rowNumber, message: '상품코드가 비어 있어요.' })
        continue
      }

      if (seenInputCodes.has(normalizedCode)) {
        skipped += 1
        errors.push({ row: rowNumber, productCode: rawProductCode.trim(), message: 'CSV 안에서 상품코드가 중복돼요.' })
        continue
      }
      seenInputCodes.add(normalizedCode)

      const productName = normalizeOptionalCell(getCell(row, indexByField.get('productName')))
      const optionName = normalizeOptionalCell(getCell(row, indexByField.get('optionName')))
      const manufacturerNameInput = normalizeOptionalCell(getCell(row, indexByField.get('manufacturerName')))

      const priceParsed = parseOptionalWon(getCell(row, indexByField.get('price')))
      if (!priceParsed.ok) {
        skipped += 1
        errors.push({ row: rowNumber, productCode: rawProductCode.trim(), message: `판매가: ${priceParsed.message}` })
        continue
      }

      const costParsed = parseOptionalWon(getCell(row, indexByField.get('cost')))
      if (!costParsed.ok) {
        skipped += 1
        errors.push({ row: rowNumber, productCode: rawProductCode.trim(), message: `원가: ${costParsed.message}` })
        continue
      }

      const shippingFeeParsed = parseOptionalWon(getCell(row, indexByField.get('shippingFee')))
      if (!shippingFeeParsed.ok) {
        skipped += 1
        errors.push({ row: rowNumber, productCode: rawProductCode.trim(), message: `배송비: ${shippingFeeParsed.message}` })
        continue
      }

      let manufacturerId: number | undefined
      if (manufacturerNameInput) {
        const found = manufacturerIdByName.get(normalizeName(manufacturerNameInput))
        if (found == null) {
          skipped += 1
          errors.push({
            row: rowNumber,
            productCode: rawProductCode.trim(),
            message: `제조사 "${manufacturerNameInput}"을(를) 찾을 수 없어요.`,
          })
          continue
        }
        manufacturerId = found
      }

      const existing = existingByCode.get(normalizedCode)
      const rawCode = rawProductCode.trim()

      if (existing) {
        const set: Partial<typeof product.$inferInsert> = {
          updatedAt: new Date(),
        }

        // 빈 칸은 기존 값 유지: 값이 있을 때만 업데이트해요.
        if (productName) set.productName = productName
        if (optionName) set.optionName = optionName
        if (manufacturerId !== undefined) set.manufacturerId = manufacturerId
        if (priceParsed.value !== undefined) set.price = priceParsed.value
        if (costParsed.value !== undefined) set.cost = costParsed.value
        if (shippingFeeParsed.value !== undefined) set.shippingFee = shippingFeeParsed.value

        const changeKeys = Object.keys(set).filter((k) => k !== 'updatedAt')
        if (changeKeys.length === 0) {
          skipped += 1
          continue
        }

        await db.update(product).set(set).where(eq(product.id, existing.id))
        updated += 1

        if (manufacturerId !== undefined && manufacturerId !== null) {
          await applyManufacturerToExistingOrders({
            manufacturerId,
            manufacturerName: manufacturerNameById.get(manufacturerId) ?? null,
            productCode: existing.rawCode,
          })
        }

        continue
      }

      try {
        const [inserted] = await db
          .insert(product)
          .values({
            productCode: rawCode,
            productName: productName ?? '',
            optionName: optionName ?? '',
            manufacturerId: manufacturerId ?? null,
            price: priceParsed.value ?? 0,
            cost: costParsed.value ?? 0,
            shippingFee: shippingFeeParsed.value ?? 0,
          })
          .returning({ id: product.id })

        created += 1

        if (manufacturerId !== undefined && manufacturerId !== null) {
          await applyManufacturerToExistingOrders({
            manufacturerId,
            manufacturerName: manufacturerNameById.get(manufacturerId) ?? null,
            productCode: rawCode,
          })
        }

        if (inserted?.id != null) {
          existingByCode.set(normalizedCode, { id: inserted.id, manufacturerId: manufacturerId ?? null, rawCode })
        }
      } catch (err) {
        console.error('importProductsCsv insert error:', err)

        const normalizedRowCode = normalizeProductCode(rawCode)
        const fallbackExisting = normalizedRowCode ? existingByCode.get(normalizedRowCode) : undefined
        if (!fallbackExisting) {
          skipped += 1
          errors.push({ row: rowNumber, productCode: rawCode, message: '상품을 저장하지 못했어요.' })
          continue
        }

        const set: Partial<typeof product.$inferInsert> = {
          updatedAt: new Date(),
        }

        if (productName) set.productName = productName
        if (optionName) set.optionName = optionName
        if (manufacturerId !== undefined) set.manufacturerId = manufacturerId
        if (priceParsed.value !== undefined) set.price = priceParsed.value
        if (costParsed.value !== undefined) set.cost = costParsed.value
        if (shippingFeeParsed.value !== undefined) set.shippingFee = shippingFeeParsed.value

        const changeKeys = Object.keys(set).filter((k) => k !== 'updatedAt')
        if (changeKeys.length === 0) {
          skipped += 1
          continue
        }

        await db.update(product).set(set).where(eq(product.id, fallbackExisting.id))
        updated += 1
      }
    }

    return {
      success: true,
      totalRows,
      created,
      updated,
      skipped,
      errors,
    }
  } catch (err) {
    console.error('importProductsCsv:', err)
    return { error: 'CSV를 처리하지 못했어요. 파일 내용을 확인해 주세요.' }
  }
}

async function applyManufacturerToExistingOrders({
  manufacturerId,
  manufacturerName,
  productCode,
}: {
  manufacturerId: number
  manufacturerName: string | null
  productCode: string
}): Promise<void> {
  await db
    .update(order)
    .set({
      manufacturerId,
      manufacturerName,
    })
    .where(
      and(
        isNull(order.manufacturerId),
        sql`lower(trim(${order.productCode})) = lower(trim(${productCode}))`,
        sql`${order.status} <> 'completed'`,
      ),
    )
}

function getCell(row: string[], index: number | undefined): string {
  if (index == null) return ''
  return row[index] ?? ''
}

function headerToCanonicalField(header: string): CanonicalField | null {
  const h = header.trim()
  const hNoSpace = h.replaceAll(' ', '')
  const normalized = hNoSpace.toLowerCase().replaceAll('_', '').replaceAll('-', '')

  if (hNoSpace === '상품코드' || hNoSpace === '상품코드(필수)' || normalized === 'productcode' || normalized === 'code') return 'productCode'
  if (hNoSpace === '상품명' || normalized === 'productname') return 'productName'
  if (hNoSpace === '옵션명' || normalized === 'optionname') return 'optionName'
  if (hNoSpace === '제조사명' || hNoSpace === '제조사' || normalized === 'manufacturername') return 'manufacturerName'
  if (hNoSpace === '판매가' || normalized === 'price') return 'price'
  if (hNoSpace === '원가' || normalized === 'cost') return 'cost'
  if (
    hNoSpace === '배송비' ||
    hNoSpace === '택배비' ||
    normalized === 'shippingfee' ||
    normalized === 'shippingcost' ||
    normalized === 'deliveryfee'
  )
    return 'shippingFee'

  return null
}

function isFileValue(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === 'object' &&
    value !== null &&
    'arrayBuffer' in value &&
    typeof (value as File).arrayBuffer === 'function'
  )
}

function normalizeHeaderCell(value: string): string {
  return value.trim().replaceAll('\u00a0', ' ')
}

function normalizeName(value: string): string {
  return value.trim()
}

function normalizeOptionalCell(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function normalizeProductCode(value: string): string {
  return value.trim().toLowerCase()
}

function parseOptionalWon(value: string): { ok: false; message: string } | { ok: true; value?: number } {
  const trimmed = value.trim()
  if (!trimmed) {
    return { ok: true, value: undefined }
  }

  const normalized = trimmed.replaceAll(',', '').replaceAll('₩', '').replaceAll('원', '').trim()
  if (!normalized) {
    return { ok: true, value: undefined }
  }

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) {
    return { ok: false, message: '숫자 형식이 올바르지 않아요.' }
  }

  return { ok: true, value: Math.round(parsed) }
}



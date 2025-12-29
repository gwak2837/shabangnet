'use server'

import { inArray, sql } from 'drizzle-orm'

import { db } from '@/db/client'
import { manufacturer, optionMapping } from '@/db/schema/manufacturers'
import { order } from '@/db/schema/orders'
import { readXlsxRowsFromFile } from '@/lib/excel/read'
import { normalizeOptionName } from '@/utils/normalize-option-name'

import type { OptionMappingExcelImportResult, OptionMappingExcelRowError } from './option-mapping-excel.types'

type CanonicalField = 'manufacturerName' | 'optionName' | 'productCode'

export async function importOptionMappingsExcel(
  _prevState: OptionMappingExcelImportResult | null,
  formData: FormData,
): Promise<OptionMappingExcelImportResult> {
  try {
    const fileValue = formData.get('file')
    if (!isFileValue(fileValue)) {
      return { error: '엑셀 파일을 선택해 주세요.' }
    }

    if (fileValue.size === 0) {
      return { error: '빈 파일이에요.' }
    }

    if (!fileValue.name.toLowerCase().endsWith('.xlsx')) {
      return { error: '엑셀(.xlsx) 파일만 업로드할 수 있어요.' }
    }

    let rows: string[][]
    try {
      rows = await readXlsxRowsFromFile(fileValue)
    } catch (err) {
      console.error('importOptionMappingsExcel read error:', err)
      return { error: '엑셀 파일을 읽지 못했어요. 파일을 확인해 주세요.' }
    }

    const headerRowIndex = rows.findIndex((row) => row.some((cell) => cell.trim() !== ''))
    if (headerRowIndex < 0) {
      return { error: '엑셀 파일에 헤더가 없어요.' }
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
    const optionNameIndex = indexByField.get('optionName')
    const manufacturerNameIndex = indexByField.get('manufacturerName')

    if (productCodeIndex == null) {
      return { error: '헤더에 상품코드가 필요해요. (예: 상품코드 또는 productCode)' }
    }
    if (optionNameIndex == null) {
      return { error: '헤더에 옵션명이 필요해요. (예: 옵션명 또는 optionName)' }
    }
    if (manufacturerNameIndex == null) {
      return { error: '헤더에 제조사명이 필요해요. (예: 제조사명 또는 manufacturerName)' }
    }

    const manufacturers = await db.select({ id: manufacturer.id, name: manufacturer.name }).from(manufacturer)

    const manufacturerIdByName = new Map<string, number>()
    for (const m of manufacturers) {
      manufacturerIdByName.set(normalizeName(m.name), m.id)
    }

    const existingRows = await db
      .select({
        id: optionMapping.id,
        manufacturerId: optionMapping.manufacturerId,
        optionName: optionMapping.optionName,
        productCode: optionMapping.productCode,
      })
      .from(optionMapping)

    const existingIdsByKey = new Map<string, number[]>()
    const existingManufacturerById = new Map<number, number | null>()

    for (const row of existingRows) {
      const key = buildKey(row.productCode, row.optionName)
      const prev = existingIdsByKey.get(key)
      if (prev) {
        prev.push(row.id)
      } else {
        existingIdsByKey.set(key, [row.id])
      }
      existingManufacturerById.set(row.id, row.manufacturerId ?? null)
    }

    const errors: OptionMappingExcelRowError[] = []
    const seenInputKeys = new Set<string>()

    let totalRows = 0
    let created = 0
    let updated = 0
    let skipped = 0

    const toInsert: Array<{ manufacturerId: number; optionName: string; productCode: string }> = []
    const toUpdateByKey: Array<{ ids: number[]; manufacturerId: number; key: string }> = []
    for (let i = 0; i < dataRows.length; i += 1) {
      const row = dataRows[i] ?? []
      const rowNumber = headerRowIndex + 2 + i

      const isEmptyRow = row.every((cell) => cell.trim() === '')
      if (isEmptyRow) {
        continue
      }

      totalRows += 1

      const rawProductCode = getCell(row, productCodeIndex)
      const productCode = normalizeRequiredCell(rawProductCode)
      if (!productCode) {
        skipped += 1
        errors.push({ row: rowNumber, message: '상품코드가 비어 있어요.' })
        continue
      }

      const rawOptionName = getCell(row, optionNameIndex)
      const optionNameRaw = normalizeRequiredCell(rawOptionName)
      if (!optionNameRaw) {
        skipped += 1
        errors.push({ row: rowNumber, productCode, message: '옵션명이 비어 있어요.' })
        continue
      }

      const rawManufacturerName = getCell(row, manufacturerNameIndex)
      const manufacturerNameRaw = normalizeRequiredCell(rawManufacturerName)
      if (!manufacturerNameRaw) {
        skipped += 1
        errors.push({ row: rowNumber, productCode, optionName: optionNameRaw, message: '제조사명이 비어 있어요.' })
        continue
      }

      const manufacturerId = manufacturerIdByName.get(normalizeName(manufacturerNameRaw))
      if (manufacturerId == null) {
        skipped += 1
        errors.push({
          row: rowNumber,
          productCode,
          optionName: optionNameRaw,
          manufacturerName: manufacturerNameRaw,
          message: `제조사 "${manufacturerNameRaw}"을(를) 찾을 수 없어요.`,
        })
        continue
      }

      const optionName = normalizeOptionName(optionNameRaw)
      if (!optionName) {
        skipped += 1
        errors.push({ row: rowNumber, productCode, message: '옵션명이 비어 있어요.' })
        continue
      }

      const key = buildKey(productCode, optionName)

      if (seenInputKeys.has(key)) {
        skipped += 1
        errors.push({
          row: rowNumber,
          productCode,
          optionName,
          message: '엑셀 안에서 상품코드+옵션명이 중복돼요.',
        })
        continue
      }
      seenInputKeys.add(key)

      const existingIds = existingIdsByKey.get(key)
      if (existingIds && existingIds.length > 0) {
        const needsUpdate = existingIds.some((existingId) => existingManufacturerById.get(existingId) !== manufacturerId)
        if (!needsUpdate) {
          skipped += 1
          continue
        }

        toUpdateByKey.push({ ids: existingIds, manufacturerId, key })
        updated += 1
        continue
      }

      toInsert.push({ productCode, optionName, manufacturerId })
      created += 1
    }

    const changedMappingIds: number[] = []

    await db.transaction(async (tx) => {
      if (toInsert.length > 0) {
        const insertChunks = chunk(toInsert, 5000)

        for (const values of insertChunks) {
          const inserted = await tx.insert(optionMapping).values(values).returning({ id: optionMapping.id })
          changedMappingIds.push(...inserted.map((r) => r.id))
        }
      }

      if (toUpdateByKey.length > 0) {
        const updateRows = toUpdateByKey.flatMap((u) => u.ids.map((id) => ({ id, manufacturerId: u.manufacturerId })))
        const uniqueById = new Map<number, number>()
        for (const row of updateRows) {
          uniqueById.set(row.id, row.manufacturerId)
        }

        const ids = [...uniqueById.keys()]
        const chunks = chunk(ids, 500)

        for (const chunkIds of chunks) {
          const cases = chunkIds.map((id) => sql`when ${optionMapping.id} = ${id} then ${uniqueById.get(id)!}`)
          const manufacturerExpr = sql`case ${sql.join(cases, sql` `)} else ${optionMapping.manufacturerId} end`

          await tx
            .update(optionMapping)
            .set({
              manufacturerId: manufacturerExpr,
              updatedAt: new Date(),
            })
            .where(inArray(optionMapping.id, chunkIds))

          changedMappingIds.push(...chunkIds)
        }
      }
    })

    if (changedMappingIds.length > 0) {
      const uniqueIds = Array.from(new Set(changedMappingIds))
      const idChunks = chunk(uniqueIds, 1000)

      for (const ids of idChunks) {
        await db.execute(sql`
          UPDATE ${order}
          SET
            ${order.manufacturerId} = ${optionMapping.manufacturerId},
            ${order.manufacturerName} = ${manufacturer.name}
          FROM ${optionMapping}
          INNER JOIN ${manufacturer} ON ${manufacturer.id} = ${optionMapping.manufacturerId}
          WHERE
            ${optionMapping.id} IN (${sql.join(
              ids.map((id) => sql`${id}`),
              sql`, `,
            )})
            AND lower(${order.productCode}) = lower(${optionMapping.productCode})
            AND lower(${order.optionName}) = lower(${optionMapping.optionName})
            AND ${order.status} <> 'completed'
        `)
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
    console.error('importOptionMappingsExcel:', err)
    return { error: '엑셀을 처리하지 못했어요. 파일 내용을 확인해 주세요.' }
  }
}

function buildKey(productCode: string, optionName: string): string {
  return `${productCode.trim().toLowerCase()}_${optionName.trim().toLowerCase()}`
}

function chunk<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return []
  const result: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size))
  }
  return result
}

function getCell(row: string[], index: number | undefined): string {
  if (index == null) return ''
  return row[index] ?? ''
}

function headerToCanonicalField(header: string): CanonicalField | null {
  const h = header.trim()
  const hNoSpace = h.replaceAll(' ', '')
  const normalized = hNoSpace.toLowerCase().replaceAll('_', '').replaceAll('-', '')

  if (hNoSpace === '상품코드' || hNoSpace === '상품코드(필수)' || normalized === 'productcode' || normalized === 'code')
    return 'productCode'
  if (hNoSpace === '옵션명' || hNoSpace === '옵션' || normalized === 'optionname') return 'optionName'
  if (hNoSpace === '제조사명' || hNoSpace === '제조사' || normalized === 'manufacturername') return 'manufacturerName'

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
  return value.trim().toLowerCase()
}

function normalizeRequiredCell(value: string): string {
  return value.trim()
}



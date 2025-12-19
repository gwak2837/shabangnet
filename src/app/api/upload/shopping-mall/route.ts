import { eq } from 'drizzle-orm'
import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db/client'
import { manufacturer, optionMapping, product } from '@/db/schema/manufacturers'
import { order, upload } from '@/db/schema/orders'
import { shoppingMallTemplate } from '@/db/schema/settings'
import { groupOrdersByManufacturer } from '@/lib/excel'
import { getCellValue } from '@/lib/excel/util'
import { parseShoppingMallTemplateColumnConfig } from '@/services/shopping-mall-template-config'

import type { UploadError } from '../type'

import {
  autoCreateManufacturers,
  autoCreateProducts,
  autoCreateUnmappedOptionCandidates,
  buildLookupMaps,
  calculateManufacturerBreakdown,
  calculateSummary,
  matchManufacturerId,
  VALID_EXTENSIONS,
} from '../common'
import { parseShoppingMallFile } from './excel'
import { prepareOrderValues, type UploadResult } from './util'

const uploadFormSchema = z.object({
  file: z
    .instanceof(File, { message: '파일이 없거나 유효하지 않아요' })
    .refine((file) => VALID_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext)), {
      message: '.xlsx, .xls 엑셀 파일만 업로드 가능해요',
    }),
  mallId: z.coerce.number({ message: '쇼핑몰을 선택해주세요' }).min(1, '쇼핑몰을 선택해주세요'),
})

interface ShoppingMallUploadSourceSnapshot {
  columnCount: number
  dataRows: Array<{ cells: string[]; rowNumber: number }>
  dataStartRow: number
  headerCells: string[]
  headerRow: number
  prefixRows: string[][]
  sheetName: string
  totalRows: number
}

export async function GET(): Promise<NextResponse> {
  const templates = await db
    .select({
      id: shoppingMallTemplate.id,
      name: shoppingMallTemplate.mallName,
      displayName: shoppingMallTemplate.displayName,
    })
    .from(shoppingMallTemplate)
    .where(eq(shoppingMallTemplate.enabled, true))
    .orderBy(shoppingMallTemplate.displayName)

  return NextResponse.json({ malls: templates })
}

export async function POST(request: Request): Promise<NextResponse<UploadResult | { error: string }>> {
  try {
    const formData = await request.formData()

    const validation = uploadFormSchema.safeParse({
      file: formData.get('file'),
      mallId: formData.get('mall-id'),
    })

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.message }, { status: 400 })
    }

    const { file, mallId } = validation.data

    const [dbTemplate] = await db
      .select({
        mallName: shoppingMallTemplate.mallName,
        displayName: shoppingMallTemplate.displayName,
        headerRow: shoppingMallTemplate.headerRow,
        dataStartRow: shoppingMallTemplate.dataStartRow,
        columnMappings: shoppingMallTemplate.columnMappings,
      })
      .from(shoppingMallTemplate)
      .where(eq(shoppingMallTemplate.id, mallId))

    if (!dbTemplate) {
      return NextResponse.json({ error: '알 수 없는 쇼핑몰이에요' }, { status: 400 })
    }

    const parsedColumnConfig = (() => {
      try {
        const raw = dbTemplate.columnMappings ? (JSON.parse(dbTemplate.columnMappings) as unknown) : {}
        return parseShoppingMallTemplateColumnConfig(raw)
      } catch {
        return { columnMappings: {}, fixedValues: {} }
      }
    })()

    const mallConfig = {
      mallName: dbTemplate.mallName,
      displayName: dbTemplate.displayName,
      headerRow: dbTemplate.headerRow ?? 1,
      dataStartRow: dbTemplate.dataStartRow ?? 2,
      columnMappings: parsedColumnConfig.columnMappings,
      fixedValues: parsedColumnConfig.fixedValues,
    }

    const buffer = await file.arrayBuffer()
    const parseResult = await parseShoppingMallFile(buffer, mallConfig)

    if (parseResult.orders.length === 0 && parseResult.errors.length > 0) {
      return NextResponse.json({ error: parseResult.errors[0].message }, { status: 400 })
    }

    const sourceSnapshot =
      parseResult.orders.length > 0
        ? await createSourceSnapshot({
            buffer,
            headerRow: mallConfig.headerRow,
            dataStartRow: mallConfig.dataStartRow,
            validRowNumbers: parseResult.orders.map((o) => o.rowIndex),
          })
        : null

    const [allManufacturers, allProducts, allOptionMappings] = await Promise.all([
      db.select({ id: manufacturer.id, name: manufacturer.name }).from(manufacturer),
      db.select({ productCode: product.productCode, manufacturerId: product.manufacturerId }).from(product),
      db
        .select({
          productCode: optionMapping.productCode,
          optionName: optionMapping.optionName,
          manufacturerId: optionMapping.manufacturerId,
        })
        .from(optionMapping),
    ])

    const lookupMaps = buildLookupMaps(allManufacturers, allProducts, allOptionMappings)

    const { insertedCount, uploadId, autoCreatedManufacturers } = await db.transaction(async (tx) => {
      const [uploadRecord] = await tx
        .insert(upload)
        .values({
          fileName: file.name,
          fileSize: file.size,
          fileType: 'shopping_mall',
          shoppingMallId: mallId,
          sourceSnapshot: sourceSnapshot ? JSON.stringify(sourceSnapshot) : null,
          totalOrders: parseResult.totalRows - mallConfig.headerRow,
          processedOrders: parseResult.orders.length,
          errorOrders: parseResult.errors.length,
          status: 'completed',
        })
        .returning()

      const createdManufacturerNames = await autoCreateManufacturers({
        orders: parseResult.orders,
        lookupMaps,
        tx,
      })

      await autoCreateUnmappedOptionCandidates({
        orders: parseResult.orders,
        lookupMaps,
        tx,
      })

      const orderValues = prepareOrderValues({
        orders: parseResult.orders,
        uploadId: uploadRecord.id,
        lookupMaps,
        displayName: mallConfig.displayName,
      })

      if (orderValues.length === 0) {
        return { insertedCount: 0, uploadId: uploadRecord.id, autoCreatedManufacturers: createdManufacturerNames }
      }

      await autoCreateProducts({ orderValues, tx })

      const insertResult = await tx
        .insert(order)
        .values(orderValues)
        .onConflictDoNothing({ target: order.sabangnetOrderNumber })
        .returning({ id: order.id })

      return {
        insertedCount: insertResult.length,
        uploadId: uploadRecord.id,
        autoCreatedManufacturers: createdManufacturerNames,
      }
    })

    const duplicateCount = parseResult.orders.length - insertedCount
    const manufacturerNameById = new Map<number, string>()

    for (const mfr of lookupMaps.manufacturerMap.values()) {
      manufacturerNameById.set(mfr.id, mfr.name)
    }

    const ordersForBreakdown = parseResult.orders.map((o) => {
      const matchedManufacturerId = matchManufacturerId(o, lookupMaps)
      if (matchedManufacturerId == null) {
        return o
      }
      const resolvedName = manufacturerNameById.get(matchedManufacturerId)
      return resolvedName ? { ...o, manufacturer: resolvedName } : o
    })

    const groupedOrders = groupOrdersByManufacturer(ordersForBreakdown)
    const manufacturerBreakdown = calculateManufacturerBreakdown(groupedOrders)
    const summary = calculateSummary(manufacturerBreakdown)

    const errors: UploadError[] = parseResult.errors.map((err) => ({
      row: err.row,
      message: err.message,
      productCode: err.data?.productCode as string | undefined,
      productName: err.data?.productName as string | undefined,
    }))

    const result: UploadResult = {
      mallName: mallConfig.displayName,
      uploadId,
      processedOrders: insertedCount,
      duplicateOrders: duplicateCount,
      errorOrders: parseResult.errors.length,
      manufacturerBreakdown,
      errors,
      orderNumbers: parseResult.orders.map((o) => o.sabangnetOrderNumber),
      summary,
      autoCreatedManufacturers,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error(error)
    const errorMessage = error instanceof Error ? error.message : '쇼핑몰 파일을 업로드하지 못했어요'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

async function createSourceSnapshot(params: {
  buffer: ArrayBuffer
  dataStartRow: number
  headerRow: number
  validRowNumbers: number[]
}): Promise<ShoppingMallUploadSourceSnapshot> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(params.buffer)
  const worksheet = workbook.worksheets[0]

  if (!worksheet) {
    throw new Error('워크시트를 찾을 수 없어요')
  }

  const columnCount = worksheet.columnCount
  const totalRows = worksheet.rowCount
  const headerRow = Math.max(1, params.headerRow)
  const dataStartRow = Math.max(1, params.dataStartRow)

  const prefixRows: string[][] = []
  for (let rowNumber = 1; rowNumber < headerRow; rowNumber++) {
    prefixRows.push(readRowCells(worksheet.getRow(rowNumber), columnCount))
  }

  const headerCells = readRowCells(worksheet.getRow(headerRow), columnCount)

  const dataRows = params.validRowNumbers
    .filter((rowNumber) => rowNumber >= dataStartRow && rowNumber <= totalRows)
    .map((rowNumber) => ({
      rowNumber,
      cells: readRowCells(worksheet.getRow(rowNumber), columnCount),
    }))

  return {
    sheetName: worksheet.name,
    totalRows,
    columnCount,
    headerRow,
    dataStartRow,
    prefixRows,
    headerCells,
    dataRows,
  }
}

function readRowCells(row: ExcelJS.Row, columnCount: number): string[] {
  const cells: string[] = []
  for (let col = 1; col <= columnCount; col++) {
    cells.push(getCellValue(row.getCell(col)))
  }
  return cells
}

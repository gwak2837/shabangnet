import { eq } from 'drizzle-orm'
import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'
import { PassThrough, Readable } from 'node:stream'
import { z } from 'zod'

import { db } from '@/db/client'
import { manufacturer, optionMapping, product } from '@/db/schema/manufacturers'
import { upload } from '@/db/schema/orders'
import { shoppingMallTemplate } from '@/db/schema/settings'
import { formatDateForFileName, type ParsedOrder, type ParseError } from '@/lib/excel'
import { getCellValue } from '@/lib/excel/util'
import { parseShoppingMallTemplateColumnConfig } from '@/services/shopping-mall-template-config'

import type { UploadError, UploadSummary } from '../type'

import {
  autoCreateManufacturers,
  autoCreateProducts,
  autoCreateUnmappedOptionCandidates,
  buildLookupMaps,
  VALID_EXTENSIONS,
} from '../common'
import { parseShoppingMallWorksheet } from './excel'
import { prepareOrderValues } from './util'

export const maxDuration = 60

const uploadFormSchema = z.object({
  file: z
    .instanceof(File, { message: '파일이 없거나 유효하지 않아요' })
    .refine((file) => VALID_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext)), {
      message: '.xlsx, .xls 엑셀 파일만 업로드 가능해요',
    }),
  mallId: z.coerce.number({ message: '쇼핑몰을 선택해주세요' }).min(1, '쇼핑몰을 선택해주세요'),
})

const exportConfigSchema = z.object({
  copyPrefixRows: z.boolean().optional(),
  columns: z
    .array(
      z.object({
        header: z.string().optional(),
        source: z.discriminatedUnion('type', [
          z.object({ type: z.literal('input'), columnIndex: z.number().int().min(1) }),
          z.object({ type: z.literal('const'), value: z.string() }),
        ]),
      }),
    )
    .min(1),
})

type ExportConfig = z.infer<typeof exportConfigSchema>

interface ShoppingMallUploadMetaV1 {
  autoCreatedManufacturers: string[]
  errorSamples: UploadError[]
  kind: 'shopping_mall_upload_meta'
  mallName: string
  summary: UploadSummary
  v: 1
}

const ERROR_SAMPLE_LIMIT = 50

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

export async function POST(request: Request): Promise<Response> {
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
        exportConfig: shoppingMallTemplate.exportConfig,
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

    if (!dbTemplate.exportConfig) {
      return NextResponse.json({ error: '다운로드 템플릿이 등록되지 않았어요' }, { status: 400 })
    }

    const exportConfig = (() => {
      try {
        const json: unknown = JSON.parse(dbTemplate.exportConfig)
        const parsed = exportConfigSchema.safeParse(json)
        if (!parsed.success) {
          return null
        }
        return parsed.data
      } catch {
        return null
      }
    })()

    if (!exportConfig) {
      return NextResponse.json({ error: '다운로드 템플릿 형식이 올바르지 않아요' }, { status: 500 })
    }

    const buffer = await file.arrayBuffer()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const worksheet = workbook.worksheets[0]

    if (!worksheet) {
      await db.insert(upload).values({
        fileName: file.name,
        fileSize: file.size,
        fileType: 'shopping_mall',
        shoppingMallId: mallId,
        totalOrders: 0,
        processedOrders: 0,
        errorOrders: 1,
        status: 'error',
        meta: {
          v: 1,
          kind: 'shopping_mall_upload_meta',
          mallName: mallConfig.displayName,
          summary: { totalAmount: 0, totalCost: 0, estimatedMargin: null },
          errorSamples: [{ row: 0, message: '워크시트를 찾을 수 없어요' }],
          autoCreatedManufacturers: [],
        } satisfies ShoppingMallUploadMetaV1,
      })

      return NextResponse.json({ error: '워크시트를 찾을 수 없어요' }, { status: 400 })
    }

    const parseResult = parseShoppingMallWorksheet(worksheet, mallConfig)

    const fatalError = parseResult.errors.find((err) => err.row === 0)
    if (fatalError) {
      await db.insert(upload).values({
        fileName: file.name,
        fileSize: file.size,
        fileType: 'shopping_mall',
        shoppingMallId: mallId,
        totalOrders: 0,
        processedOrders: 0,
        errorOrders: 1,
        status: 'error',
        meta: {
          v: 1,
          kind: 'shopping_mall_upload_meta',
          mallName: mallConfig.displayName,
          summary: { totalAmount: 0, totalCost: 0, estimatedMargin: null },
          errorSamples: [{ row: 0, message: fatalError.message }],
          autoCreatedManufacturers: [],
        } satisfies ShoppingMallUploadMetaV1,
      })

      return NextResponse.json({ error: fatalError.message }, { status: 400 })
    }

    const rowErrors = parseResult.errors.filter((err) => err.row > 0)
    const processedOrders = parseResult.orders.length
    const errorOrders = rowErrors.length
    const totalOrders = processedOrders + errorOrders

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

    const summary = calculateUploadSummary(parseResult.orders)
    const errorSamples = toUploadErrorSamples(rowErrors)

    const { uploadRecord } = await db.transaction(async (tx) => {
      const [uploadRecord] = await tx
        .insert(upload)
        .values({
          fileName: file.name,
          fileSize: file.size,
          fileType: 'shopping_mall',
          shoppingMallId: mallId,
          totalOrders,
          processedOrders: 0,
          errorOrders: 0,
          status: 'processing',
          meta: null,
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

      if (orderValues.length > 0) {
        await autoCreateProducts({ orderValues, tx })
      }

      const meta: ShoppingMallUploadMetaV1 = {
        v: 1,
        kind: 'shopping_mall_upload_meta',
        mallName: mallConfig.displayName,
        summary,
        errorSamples,
        autoCreatedManufacturers: createdManufacturerNames,
      }

      await tx
        .update(upload)
        .set({
          status: 'completed',
          processedOrders,
          errorOrders,
          meta,
        })
        .where(eq(upload.id, uploadRecord.id))

      return { uploadRecord }
    })

    const downloadName = encodeURIComponent(
      `${mallConfig.displayName}_${formatDateForFileName(uploadRecord.uploadedAt)}.xlsx`,
    )

    const stream = new PassThrough()
    const response = new Response(Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${downloadName}"`,
        'X-Upload-Id': String(uploadRecord.id),
      },
    })

    void writeShoppingMallExportToStream({
      stream,
      worksheet,
      exportConfig,
      headerRow: mallConfig.headerRow,
      dataStartRow: mallConfig.dataStartRow,
      validRowNumbers: parseResult.orders.map((o) => o.rowIndex),
      errors: rowErrors,
    })

    return response
  } catch (error) {
    console.error(error)
    const errorMessage = error instanceof Error ? error.message : '쇼핑몰 파일을 업로드하지 못했어요'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

function calculateUploadSummary(orders: ParsedOrder[]): UploadSummary {
  let totalAmount = 0
  let totalCost = 0

  for (const o of orders) {
    totalAmount += Number.isFinite(o.paymentAmount) ? o.paymentAmount : 0
    totalCost += Number.isFinite(o.cost) ? o.cost : 0
  }

  const estimatedMargin = totalCost > 0 ? totalAmount - totalCost : null
  return { totalAmount, totalCost, estimatedMargin }
}

function getCellValueFromSource(source: ExportConfig['columns'][number]['source'], rowCells: string[]): string {
  if (source.type === 'const') {
    return source.value
  }

  const idx = source.columnIndex - 1
  return rowCells[idx] ?? ''
}

function getMaxReferencedInputColumnIndex(exportConfig: ExportConfig): number {
  let maxIndex = 0
  for (const col of exportConfig.columns) {
    if (col.source.type === 'input') {
      maxIndex = Math.max(maxIndex, col.source.columnIndex)
    }
  }
  return Math.max(1, maxIndex)
}

function readRowCells(row: ExcelJS.Row, maxColumnIndex: number): string[] {
  const cells: string[] = []
  for (let col = 1; col <= maxColumnIndex; col++) {
    cells.push(getCellValue(row.getCell(col)))
  }
  return cells
}

function toUploadErrorSamples(errors: ParseError[]): UploadError[] {
  return errors.slice(0, ERROR_SAMPLE_LIMIT).map((err) => ({
    row: err.row,
    message: err.message,
    productCode: typeof err.data?.productCode === 'string' ? err.data.productCode : undefined,
    productName: typeof err.data?.productName === 'string' ? err.data.productName : undefined,
  }))
}

async function writeShoppingMallExportToStream(params: {
  dataStartRow: number
  errors: ParseError[]
  exportConfig: ExportConfig
  headerRow: number
  stream: PassThrough
  validRowNumbers: number[]
  worksheet: ExcelJS.Worksheet
}): Promise<void> {
  try {
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: params.stream,
      useSharedStrings: false,
      useStyles: false,
    })

    workbook.creator = '(주)다온에프앤씨'
    workbook.created = new Date()

    const maxInputColumnIndex = getMaxReferencedInputColumnIndex(params.exportConfig)
    const safeHeaderRow = Math.max(1, params.headerRow)
    const safeDataStartRow = Math.max(1, params.dataStartRow)
    const outputColumns = params.exportConfig.columns
    const copyPrefixRows = params.exportConfig.copyPrefixRows ?? true
    const sheetName = params.worksheet.name || '변환결과'

    const worksheet = workbook.addWorksheet(sheetName)

    if (copyPrefixRows) {
      for (let rowNumber = 1; rowNumber < safeHeaderRow; rowNumber++) {
        const sourceCells = readRowCells(params.worksheet.getRow(rowNumber), maxInputColumnIndex)
        const rowValues = outputColumns.map((col) => getCellValueFromSource(col.source, sourceCells))
        worksheet.addRow(rowValues).commit()
      }
    }

    const headerCells = readRowCells(params.worksheet.getRow(safeHeaderRow), maxInputColumnIndex)
    const headerValues = outputColumns.map((col) => {
      if (col.header !== undefined) {
        return col.header
      }
      if (col.source.type === 'input') {
        return headerCells[col.source.columnIndex - 1] ?? ''
      }
      return ''
    })
    const headerRow = worksheet.addRow(headerValues)
    headerRow.font = { bold: true }
    headerRow.commit()

    const totalRows = params.worksheet.rowCount
    for (const rowNumber of params.validRowNumbers) {
      if (rowNumber < safeDataStartRow || rowNumber > totalRows) {
        continue
      }
      const sourceCells = readRowCells(params.worksheet.getRow(rowNumber), maxInputColumnIndex)
      const rowValues = outputColumns.map((col) => getCellValueFromSource(col.source, sourceCells))
      worksheet.addRow(rowValues).commit()
    }

    const rowErrors = params.errors.filter((err) => err.row > 0)
    if (rowErrors.length > 0) {
      const errorSheet = workbook.addWorksheet('오류')
      const errorHeaderRow = errorSheet.addRow(['행', '메시지'])
      errorHeaderRow.font = { bold: true }
      errorHeaderRow.commit()

      for (const err of rowErrors) {
        errorSheet.addRow([err.row, err.message]).commit()
      }
    }

    await workbook.commit()
    params.stream.end()
  } catch (error) {
    console.error('Shopping mall export error:', error)
    const err = error instanceof Error ? error : new Error('쇼핑몰 엑셀 생성 중 오류가 발생했어요')
    params.stream.destroy(err)
  }
}

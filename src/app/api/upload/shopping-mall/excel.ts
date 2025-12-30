import type { PassThrough } from 'node:stream'

import ExcelJS from 'exceljs'
import { Readable } from 'node:stream'

import { getCellValue } from '@/lib/excel/util'
import { parseLooseNumber } from '@/utils/coerce'
import { normalizeManufacturerName } from '@/utils/normalize-manufacturer-name'
import { normalizeOptionName } from '@/utils/normalize-option-name'

import type { UploadError, UploadSummary } from '../type'
import type { ShoppingMallUploadTemplate } from './template'

import { ERROR_SAMPLE_LIMIT } from './types'

export interface ShoppingMallConversionResult {
  errorOrders: number
  errorSamples: UploadError[]
  manufacturerNames: string[]
  optionCandidates: Array<{ optionName: string; productCode: string }>
  processedOrders: number
  products: ShoppingMallProductAggregate[]
  summary: UploadSummary
  totalOrders: number
}

export type ShoppingMallPreflightResult =
  | { ok: false; error: string }
  | {
      ok: true
      fieldColumnIndex: Map<string, number>
      headerColumnMap: Map<string, number>
      sheetName: string
    }

export interface ShoppingMallProductAggregate {
  cost: number
  manufacturerName: string | null
  optionName: string | null
  price: number
  productCode: string
  productName: string
}

export async function convertShoppingMallWorkbookToStream(params: {
  buffer: Buffer
  preflight: Exclude<ShoppingMallPreflightResult, { ok: false }>
  stream: PassThrough
  template: ShoppingMallUploadTemplate
}): Promise<ShoppingMallConversionResult> {
  const exportColumns = params.template.exportConfig.columns
  const copyPrefixRows = params.template.exportConfig.copyPrefixRows ?? true
  const safeHeaderRow = Math.max(1, params.template.headerRow)
  const safeDataStartRow = Math.max(1, params.template.dataStartRow)
  const workbookReader = getWorkbookReader(params.buffer)
  let worksheetReader

  for await (const ws of workbookReader) {
    worksheetReader = ws
    break
  }

  if (!worksheetReader) {
    throw new Error('워크시트를 찾을 수 없어요')
  }

  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: params.stream,
    useSharedStrings: false,
    useStyles: false,
  })

  workbook.creator = '(주)다온에프앤씨'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet(params.preflight.sheetName || '변환결과')
  const errorSamples: UploadError[] = []
  const manufacturerKeyToName = new Map<string, string>()
  const optionCandidateByKey = new Map<string, { optionName: string; productCode: string }>()
  const productByCodeKey = new Map<string, ShoppingMallProductAggregate>()

  let errorSheet: ExcelJS.Worksheet | null = null
  let errorHeaderWritten = false
  let processedOrders = 0
  let errorOrders = 0
  let totalAmount = 0
  let totalCost = 0
  let lastPrefixRowNumber = 0
  let headerWritten = false

  const writeError = (payload: { row: number; message: string; productCode?: string; productName?: string }) => {
    errorOrders += 1

    if (!errorSheet) {
      errorSheet = workbook.addWorksheet('오류')
    }

    if (!errorHeaderWritten) {
      const header = errorSheet.addRow(['행', '메시지'])
      header.font = { bold: true }
      header.commit()
      errorHeaderWritten = true
    }

    errorSheet.addRow([payload.row, payload.message]).commit()

    if (errorSamples.length < ERROR_SAMPLE_LIMIT) {
      errorSamples.push(payload)
    }
  }

  const getRowValuesForExport = (row: ExcelJS.Row): string[] => {
    const values = new Array<string>(exportColumns.length)
    for (let i = 0; i < exportColumns.length; i++) {
      const col = exportColumns[i]
      if (col.source.type === 'const') {
        values[i] = col.source.value
        continue
      }
      values[i] = getCellValue(row.getCell(col.source.columnIndex))
    }
    return values
  }

  try {
    for await (const row of worksheetReader) {
      // 1) Prefix rows
      if (row.number < safeHeaderRow) {
        if (!copyPrefixRows) {
          continue
        }

        // preserve gaps (blank rows) before header
        const gap = row.number - lastPrefixRowNumber - 1
        for (let i = 0; i < gap; i++) {
          worksheet.addRow(new Array<string>(exportColumns.length).fill('')).commit()
        }

        worksheet.addRow(getRowValuesForExport(row)).commit()
        lastPrefixRowNumber = row.number
        continue
      }

      // 2) Header row
      if (row.number === safeHeaderRow) {
        if (copyPrefixRows) {
          const gap = row.number - lastPrefixRowNumber - 1
          for (let i = 0; i < gap; i++) {
            worksheet.addRow(new Array<string>(exportColumns.length).fill('')).commit()
          }
        }

        const headerValues = new Array<string>(exportColumns.length)
        for (let i = 0; i < exportColumns.length; i++) {
          const col = exportColumns[i]

          if (col.header !== undefined) {
            headerValues[i] = col.header
            continue
          }

          if (col.source.type === 'input') {
            headerValues[i] = getCellValue(row.getCell(col.source.columnIndex))
            continue
          }

          headerValues[i] = ''
        }

        const headerRow = worksheet.addRow(headerValues)
        headerRow.font = { bold: true }
        headerRow.commit()
        headerWritten = true
        continue
      }

      // 3) Data rows
      if (row.number < safeDataStartRow) {
        continue
      }

      if (!row.hasValues) {
        continue
      }

      const site = params.template.displayName.trim()
      if (!site) {
        throw new Error('사이트 값이 없어요')
      }

      const sabangnetOrderNumber = getFieldString({
        row,
        fieldKey: 'sabangnetOrderNumber',
        fieldColumnIndex: params.preflight.fieldColumnIndex,
        fixedValues: params.template.fixedValues,
      })

      const mallProductNumber = getFieldString({
        row,
        fieldKey: 'mallProductNumber',
        fieldColumnIndex: params.preflight.fieldColumnIndex,
        fixedValues: params.template.fixedValues,
      })

      const productName = getFieldString({
        row,
        fieldKey: 'productName',
        fieldColumnIndex: params.preflight.fieldColumnIndex,
        fixedValues: params.template.fixedValues,
      })

      if (!sabangnetOrderNumber) {
        writeError({ row: row.number, message: '주문번호가 없어요', productName })
        continue
      }

      if (!mallProductNumber) {
        writeError({ row: row.number, message: '쇼핑몰상품번호가 없어요', productName })
        continue
      }

      const productCode = `${site}::${mallProductNumber}`

      if (!headerWritten && safeHeaderRow >= safeDataStartRow) {
        // 헤더보다 데이터가 먼저라면(설정 오류), 다운로드 파일 구조가 깨질 수 있어서 중단해요.
        throw new Error('템플릿의 헤더/데이터 시작 행 설정을 확인해 주세요')
      }

      worksheet.addRow(getRowValuesForExport(row)).commit()
      processedOrders += 1

      // summary
      const paymentAmount = parseLooseNumber(
        getFieldString({
          row,
          fieldKey: 'paymentAmount',
          fieldColumnIndex: params.preflight.fieldColumnIndex,
          fixedValues: params.template.fixedValues,
        }),
      )
      const cost = parseLooseNumber(
        getFieldString({
          row,
          fieldKey: 'cost',
          fieldColumnIndex: params.preflight.fieldColumnIndex,
          fixedValues: params.template.fixedValues,
        }),
      )
      totalAmount += Number.isFinite(paymentAmount) ? paymentAmount : 0
      totalCost += Number.isFinite(cost) ? cost : 0

      // manufacturer (auto-create)
      const rawManufacturer = getFieldString({
        row,
        fieldKey: 'manufacturerName',
        fieldColumnIndex: params.preflight.fieldColumnIndex,
        fixedValues: params.template.fixedValues,
      })
      const manufacturerName = rawManufacturer ? normalizeManufacturerName(rawManufacturer) : null
      if (manufacturerName) {
        const key = manufacturerName.toLowerCase()
        if (!manufacturerKeyToName.has(key)) {
          manufacturerKeyToName.set(key, manufacturerName)
        }
      }

      // option / product aggregates
      const optionName = normalizeOptionName(
        getFieldString({
          row,
          fieldKey: 'optionName',
          fieldColumnIndex: params.preflight.fieldColumnIndex,
          fixedValues: params.template.fixedValues,
        }),
      )
      const productCodeKey = productCode.toLowerCase()

      const quantity = (() => {
        const raw = getFieldString({
          row,
          fieldKey: 'quantity',
          fieldColumnIndex: params.preflight.fieldColumnIndex,
          fixedValues: params.template.fixedValues,
        })
        const parsed = Number.parseInt(raw, 10)
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
      })()

      const unitPrice = Number.isFinite(paymentAmount) && paymentAmount > 0 ? Math.round(paymentAmount / quantity) : 0
      const unitCost = Number.isFinite(cost) && cost > 0 ? Math.round(cost / quantity) : 0

      if (!manufacturerName && optionName) {
        const key = `${productCodeKey}_${optionName.toLowerCase()}`
        if (!optionCandidateByKey.has(key)) {
          optionCandidateByKey.set(key, { productCode, optionName })
        }
      }

      if (productName) {
        if (!productByCodeKey.has(productCodeKey)) {
          productByCodeKey.set(productCodeKey, {
            productCode,
            productName,
            optionName: optionName || null,
            manufacturerName,
            price: unitPrice,
            cost: unitCost,
          })
        } else {
          const prev = productByCodeKey.get(productCodeKey)
          if (!prev) {
            continue
          }
          if (!prev.manufacturerName && manufacturerName) {
            prev.manufacturerName = manufacturerName
          }
          if ((!prev.optionName || prev.optionName.trim().length === 0) && optionName) {
            prev.optionName = optionName
          }
          if (prev.price === 0 && unitPrice > 0) {
            prev.price = unitPrice
          }
          if (prev.cost === 0 && unitCost > 0) {
            prev.cost = unitCost
          }
        }
      }
    }

    worksheet.commit()
    await workbook.commit()
    params.stream.end()

    const summary = calculateSummaryFromTotals(totalAmount, totalCost)
    const totalOrders = processedOrders + errorOrders

    return {
      processedOrders,
      errorOrders,
      totalOrders,
      summary,
      errorSamples,
      manufacturerNames: [...manufacturerKeyToName.values()],
      optionCandidates: [...optionCandidateByKey.values()],
      products: [...productByCodeKey.values()],
    }
  } catch (error) {
    console.error('Shopping mall export error:', error)
    const err = error instanceof Error ? error : new Error('쇼핑몰 엑셀 생성 중 오류가 발생했어요')
    params.stream.destroy(err)
    throw err
  }
}

export async function preflightShoppingMallWorkbook(params: {
  buffer: Buffer
  template: ShoppingMallUploadTemplate
}): Promise<ShoppingMallPreflightResult> {
  const safeHeaderRow = Math.max(1, params.template.headerRow)
  const expectedHeaders = Object.keys(params.template.columnMappings)
  const workbookReader = getWorkbookReader(params.buffer)
  let worksheetReader: ExcelJS.stream.xlsx.WorksheetReader | null = null

  for await (const ws of workbookReader) {
    worksheetReader = ws
    break
  }

  if (!worksheetReader) {
    return { ok: false, error: '워크시트를 찾을 수 없어요' }
  }

  let headerRow

  for await (const row of worksheetReader) {
    if (row.number === safeHeaderRow) {
      headerRow = row
      break
    }
  }

  if (!headerRow) {
    return { ok: false, error: '헤더 행을 찾을 수 없어요' }
  }

  const headerColumnMap = buildHeaderColumnMap(headerRow)
  const missing = expectedHeaders.filter((h) => !headerColumnMap.has(h))

  if (missing.length > 0) {
    return { ok: false, error: `파일 양식이 일치하지 않아요. 누락된 열: ${missing.join(', ')}` }
  }

  return {
    ok: true,
    sheetName: '변환결과',
    headerColumnMap,
    fieldColumnIndex: buildFieldColumnIndex(params.template, headerColumnMap),
  }
}

function buildFieldColumnIndex(
  template: ShoppingMallUploadTemplate,
  headerColumnMap: Map<string, number>,
): Map<string, number> {
  const map = new Map<string, number>()

  for (const [excelHeader, fieldKey] of Object.entries(template.columnMappings)) {
    const colIndex = headerColumnMap.get(excelHeader)
    if (!colIndex) {
      continue
    }
    if (!map.has(fieldKey)) {
      map.set(fieldKey, colIndex)
    }
  }

  return map
}

function buildHeaderColumnMap(headerRow: ExcelJS.Row): Map<string, number> {
  const map = new Map<string, number>()

  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const value = getCellValue(cell).trim()
    if (!value) {
      return
    }

    // 동일한 헤더명이 여러 번 나오는 쇼핑몰 파일이 있어요.
    // 이 경우 마지막 값으로 덮어쓰면 연결이 뒤틀릴 수 있어서, "첫 번째 등장"을 기준으로 고정해요.
    if (!map.has(value)) {
      map.set(value, colNumber)
    }
  })

  return map
}

function calculateSummaryFromTotals(totalAmount: number, totalCost: number): UploadSummary {
  const estimatedMargin = totalCost > 0 ? totalAmount - totalCost : null
  return { totalAmount, totalCost, estimatedMargin }
}

function getFieldString(params: {
  fieldColumnIndex: Map<string, number>
  fieldKey: string
  fixedValues: Record<string, string>
  row: ExcelJS.Row
}): string {
  const colIndex = params.fieldColumnIndex.get(params.fieldKey)

  if (!colIndex) {
    return params.fixedValues[params.fieldKey]?.trim() ?? ''
  }

  const cell = getCellValue(params.row.getCell(colIndex)).trim()
  if (cell.length > 0) {
    return cell
  }

  return params.fixedValues[params.fieldKey]?.trim() ?? ''
}

function getWorkbookReader(buffer: Buffer): ExcelJS.stream.xlsx.WorkbookReader {
  return new ExcelJS.stream.xlsx.WorkbookReader(Readable.from(buffer), {
    worksheets: 'emit',
    sharedStrings: 'cache',
    hyperlinks: 'ignore',
    styles: 'ignore',
    entries: 'ignore',
  })
}

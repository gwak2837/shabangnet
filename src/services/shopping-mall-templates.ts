'use server'

import { eq } from 'drizzle-orm'
import ExcelJS from 'exceljs'

import { db } from '@/db/client'
import { shoppingMallTemplate } from '@/db/schema/settings'

// Types
export interface AnalyzeResult {
  detectedHeaderRow: number
  headers: string[]
  previewRows: string[][]
  totalRows: number
}

export interface CreateTemplateData {
  columnMappings: Record<string, string>
  dataStartRow: number
  displayName: string
  headerRow: number
  mallName: string
}

export interface ShoppingMallTemplate {
  columnMappings: Record<string, string>
  createdAt: string
  dataStartRow: number
  displayName: string
  enabled: boolean
  headerRow: number
  id: number
  mallName: string
  updatedAt: string
}

export interface UpdateTemplateData {
  columnMappings?: Record<string, string>
  dataStartRow?: number
  displayName?: string
  enabled?: boolean
  headerRow?: number
  mallName?: string
}

// Analyze shopping mall file
export async function analyzeShoppingMallFile(file: File, headerRow?: number): Promise<AnalyzeResult> {
  const fileBuffer = await file.arrayBuffer()

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(fileBuffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    throw new Error('워크시트를 찾을 수 없습니다')
  }

  const data: string[][] = []
  let rowCount = 0

  worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    rowCount = rowNumber
    const rowData: string[] = []
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      rowData[colNumber - 1] = getCellValue(cell)
    })
    data[rowNumber - 1] = rowData
  })

  if (data.length === 0) {
    throw new Error('파일에 데이터가 없습니다')
  }

  let headerRowIndex: number

  if (headerRow !== undefined) {
    headerRowIndex = headerRow - 1
    if (headerRowIndex < 0 || headerRowIndex >= data.length) {
      throw new Error('잘못된 헤더 행 번호입니다')
    }
  } else {
    headerRowIndex = findHeaderRow(data)
  }

  // Extract headers and filter out duplicates (from merged cells)
  const rawHeaders = (data[headerRowIndex] || []).map((h) => String(h ?? '').trim()).filter((h) => h !== '')
  const seen = new Set<string>()
  const headers = rawHeaders.filter((h) => {
    if (seen.has(h)) return false
    seen.add(h)
    return true
  })

  const previewStartIndex = headerRowIndex + 1
  const previewRows = data
    .slice(previewStartIndex, previewStartIndex + 5)
    .map((row) => (row || []).map((cell) => String(cell ?? '').trim()))

  return {
    detectedHeaderRow: headerRowIndex + 1,
    headers,
    previewRows,
    totalRows: rowCount,
  }
}

// Read operations
export async function getShoppingMallTemplate(id: number): Promise<ShoppingMallTemplate | null> {
  const [result] = await db.select().from(shoppingMallTemplate).where(eq(shoppingMallTemplate.id, id))

  if (!result) return null
  return mapToShoppingMallTemplate(result)
}

export async function getShoppingMallTemplates(): Promise<ShoppingMallTemplate[]> {
  const result = await db.select().from(shoppingMallTemplate).orderBy(shoppingMallTemplate.displayName)
  return result.map(mapToShoppingMallTemplate)
}

// Helper functions
function findHeaderRow(data: string[][]): number {
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const row = data[i]
    if (!row) continue

    const nonEmptyCells = row.filter((cell) => String(cell ?? '').trim() !== '')

    // Need at least 3 non-empty cells
    if (nonEmptyCells.length < 3) continue

    // Check for unique values - if most cells have the same value,
    // it's likely a merged title row, not a header row
    const uniqueValues = new Set(nonEmptyCells)
    const uniqueRatio = uniqueValues.size / nonEmptyCells.length

    // If more than 50% of cells are unique, this is likely a header row
    if (uniqueRatio > 0.5) {
      return i
    }
  }

  return 0
}

function getCellValue(cell: ExcelJS.Cell): string {
  const value = cell.value

  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'object') {
    if ('richText' in value) {
      return value.richText.map((rt) => rt.text).join('')
    }
    if ('hyperlink' in value && 'text' in value) {
      return String(value.text)
    }
    if (value instanceof Date) {
      return value.toISOString().split('T')[0]
    }
    if ('result' in value) {
      return String(value.result ?? '')
    }
  }

  return String(value)
}

// Helper function to map DB record to ShoppingMallTemplate
function mapToShoppingMallTemplate(record: typeof shoppingMallTemplate.$inferSelect): ShoppingMallTemplate {
  let columnMappings: Record<string, string> = {}
  try {
    columnMappings = record.columnMappings ? JSON.parse(record.columnMappings) : {}
  } catch {
    columnMappings = {}
  }

  return {
    id: record.id,
    mallName: record.mallName,
    displayName: record.displayName,
    columnMappings,
    headerRow: record.headerRow || 1,
    dataStartRow: record.dataStartRow || 2,
    enabled: record.enabled ?? true,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

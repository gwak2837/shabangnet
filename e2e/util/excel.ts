/**
 * Excel 셀 단위 비교 유틸리티
 *
 * 두 Excel 파일을 셀 단위로 비교하고 차이점을 보고합니다.
 * 유연한 비교 옵션을 지원하여 핵심 데이터만 검증할 수 있습니다.
 */

import ExcelJS from 'exceljs'
import fs from 'fs'

// 셀 차이점 타입
interface CellDifference {
  /** 실제값 */
  actual: string
  /** 셀 주소 (예: A1, B2) */
  address: string
  /** 열 번호 */
  column: number
  /** 컬럼명 (유연 비교 시) */
  columnName?: string
  /** 기대값 */
  expected: string
  /** 행 번호 */
  row: number
  /** 시트 이름 */
  sheet: string
}

// 비교 옵션
interface CompareOptions {
  /** 날짜 비교 시 날짜만 비교 (시간 무시) */
  dateOnly?: boolean
  /** 헤더 행 번호 (이 행 이후부터 데이터 비교, 1-based) */
  headerRow?: number
  /** 대소문자 무시 여부 */
  ignoreCase?: boolean
  /** 무시할 열 목록 (인덱스, 0-based) */
  ignoreColumns?: number[]
  /** 빈 셀 무시 여부 */
  ignoreEmptyCells?: boolean
  /** 무시할 행 목록 (인덱스, 0-based) */
  ignoreRows?: number[]
  /** 최대 차이점 수 (초과 시 비교 중단) */
  maxDifferences?: number
  /** 숫자 비교 시 허용 오차 */
  numericTolerance?: number
  /** 공백 트림 여부 */
  trimWhitespace?: boolean
}

// 비교 결과 타입
interface CompareResult {
  /** 실제 파일 총 행 수 */
  actualRowCount: number
  /** 실제 파일 시트 수 */
  actualSheetCount: number
  /** 차이점 목록 */
  differences: CellDifference[]
  /** 기대 파일 총 행 수 */
  expectedRowCount: number
  /** 기대 파일 시트 수 */
  expectedSheetCount: number
  /** 일치 여부 */
  isMatch: boolean
  /** 요약 메시지 */
  summary: string
}

// 유연한 비교 옵션 (핵심 컬럼만 비교)
interface FlexibleCompareOptions extends CompareOptions {
  /** 비교할 핵심 컬럼명 목록 (지정 시 해당 컬럼만 비교) */
  coreColumns?: string[]
  /** 행 순서 무시 (키 컬럼 기준으로 매칭) */
  ignoreRowOrder?: boolean
  /** 행 매칭에 사용할 키 컬럼명 (ignoreRowOrder 사용 시 필수) */
  keyColumn?: string
  /** 주소 정규화 (공백 통일) */
  normalizeAddresses?: boolean
  /** 전화번호 정규화 (하이픈, 공백 제거) */
  normalizePhoneNumbers?: boolean
}

// 유연한 비교 결과
interface FlexibleCompareResult extends CompareResult {
  /** 추가된 행 (실제에만 존재) */
  extraRows: RowData[]
  /** 매칭된 행 수 */
  matchedRows: number
  /** 누락된 행 (기대에만 존재) */
  missingRows: RowData[]
}

// 행 데이터 타입 (컬럼명 → 값 맵)
type RowData = Record<string, string>

/**
 * 두 Excel 파일을 셀 단위로 비교
 *
 * @param expectedPath 기대 결과 파일 경로
 * @param actualPath 실제 결과 파일 경로
 * @param options 비교 옵션
 * @returns 비교 결과
 */
export async function compareExcelFiles(
  expectedPath: string,
  actualPath: string,
  options: CompareOptions = {},
): Promise<CompareResult> {
  // 기본 옵션
  const opts: CompareOptions = {
    ignoreEmptyCells: true,
    trimWhitespace: true,
    ignoreCase: false,
    numericTolerance: 0.0001,
    dateOnly: true,
    maxDifferences: 100,
    ...options,
  }

  // 파일 존재 확인
  if (!fs.existsSync(expectedPath)) {
    return {
      isMatch: false,
      differences: [],
      expectedSheetCount: 0,
      actualSheetCount: 0,
      expectedRowCount: 0,
      actualRowCount: 0,
      summary: `기대 파일을 찾을 수 없습니다: ${expectedPath}`,
    }
  }

  if (!fs.existsSync(actualPath)) {
    return {
      isMatch: false,
      differences: [],
      expectedSheetCount: 0,
      actualSheetCount: 0,
      expectedRowCount: 0,
      actualRowCount: 0,
      summary: `실제 파일을 찾을 수 없습니다: ${actualPath}`,
    }
  }

  // 워크북 로드
  const expectedWorkbook = new ExcelJS.Workbook()
  const actualWorkbook = new ExcelJS.Workbook()

  await expectedWorkbook.xlsx.readFile(expectedPath)
  await actualWorkbook.xlsx.readFile(actualPath)

  const differences: CellDifference[] = []
  let expectedRowCount = 0
  let actualRowCount = 0

  // 시트 수 비교
  const expectedSheetCount = expectedWorkbook.worksheets.length
  const actualSheetCount = actualWorkbook.worksheets.length

  // 각 시트 비교
  for (let sheetIndex = 0; sheetIndex < Math.max(expectedSheetCount, actualSheetCount); sheetIndex++) {
    const expectedSheet = expectedWorkbook.worksheets[sheetIndex]
    const actualSheet = actualWorkbook.worksheets[sheetIndex]

    if (!expectedSheet && actualSheet) {
      differences.push({
        address: `Sheet${sheetIndex + 1}`,
        expected: '(없음)',
        actual: actualSheet.name,
        sheet: `Sheet${sheetIndex + 1}`,
        row: 0,
        column: 0,
      })
      continue
    }

    if (expectedSheet && !actualSheet) {
      differences.push({
        address: `Sheet${sheetIndex + 1}`,
        expected: expectedSheet.name,
        actual: '(없음)',
        sheet: `Sheet${sheetIndex + 1}`,
        row: 0,
        column: 0,
      })
      continue
    }

    if (!expectedSheet || !actualSheet) {
      continue
    }

    // 행/열 범위 계산
    const maxRow = Math.max(expectedSheet.rowCount, actualSheet.rowCount)
    const maxCol = Math.max(expectedSheet.columnCount, actualSheet.columnCount)

    expectedRowCount += expectedSheet.rowCount
    actualRowCount += actualSheet.rowCount

    // 각 셀 비교
    for (let row = opts.headerRow ?? 1; row <= maxRow; row++) {
      // 무시할 행 건너뛰기
      if (opts.ignoreRows?.includes(row - 1)) {
        continue
      }

      for (let col = 1; col <= maxCol; col++) {
        // 무시할 열 건너뛰기
        if (opts.ignoreColumns?.includes(col - 1)) {
          continue
        }

        // 최대 차이점 수 초과 시 중단
        if (opts.maxDifferences && differences.length >= opts.maxDifferences) {
          return {
            isMatch: false,
            differences,
            expectedSheetCount,
            actualSheetCount,
            expectedRowCount,
            actualRowCount,
            summary: `최대 차이점 수(${opts.maxDifferences})에 도달하여 비교를 중단했습니다.`,
          }
        }

        const expectedCell = expectedSheet.getCell(row, col)
        const actualCell = actualSheet.getCell(row, col)

        const expectedValue = getCellValue(expectedCell)
        const actualValue = getCellValue(actualCell)

        if (!valuesAreEqual(expectedValue, actualValue, opts)) {
          const address = `${String.fromCharCode(64 + col)}${row}`
          differences.push({
            address,
            expected: expectedValue,
            actual: actualValue,
            sheet: expectedSheet.name,
            row,
            column: col,
          })
        }
      }
    }
  }

  const isMatch = differences.length === 0

  let summary: string
  if (isMatch) {
    summary = `파일이 일치합니다. (${expectedSheetCount}개 시트, ${expectedRowCount}개 행)`
  } else {
    summary = `${differences.length}개의 차이점이 발견되었습니다.`
  }

  return {
    isMatch,
    differences,
    expectedSheetCount,
    actualSheetCount,
    expectedRowCount,
    actualRowCount,
    summary,
  }
}

/**
 * 두 파일의 행 수만 비교 (빠른 검증용)
 */
export async function compareRowCounts(
  expectedPath: string,
  actualPath: string,
  headerRow = 1,
): Promise<{ isMatch: boolean; expected: number; actual: number }> {
  const expectedCount = await getExcelRowCount(expectedPath, headerRow)
  const actualCount = await getExcelRowCount(actualPath, headerRow)

  return {
    isMatch: expectedCount === actualCount,
    expected: expectedCount,
    actual: actualCount,
  }
}

/**
 * 유연한 비교: 핵심 컬럼만 비교하고 행 순서를 무시할 수 있음
 *
 * @param expectedPath 기대 결과 파일 경로
 * @param actualPath 실제 결과 파일 경로
 * @param options 유연한 비교 옵션
 * @returns 비교 결과
 */
export async function flexibleCompareExcelFiles(
  expectedPath: string,
  actualPath: string,
  options: FlexibleCompareOptions = {},
): Promise<FlexibleCompareResult> {
  // 기본 옵션
  const opts: FlexibleCompareOptions = {
    ignoreEmptyCells: true,
    trimWhitespace: true,
    ignoreCase: false,
    numericTolerance: 0.01,
    dateOnly: true,
    maxDifferences: 100,
    headerRow: 1,
    normalizePhoneNumbers: true,
    normalizeAddresses: true,
    ...options,
  }

  // 파일 존재 확인
  if (!fs.existsSync(expectedPath)) {
    return {
      isMatch: false,
      differences: [],
      expectedSheetCount: 0,
      actualSheetCount: 0,
      expectedRowCount: 0,
      actualRowCount: 0,
      matchedRows: 0,
      missingRows: [],
      extraRows: [],
      summary: `기대 파일을 찾을 수 없습니다: ${expectedPath}`,
    }
  }

  if (!fs.existsSync(actualPath)) {
    return {
      isMatch: false,
      differences: [],
      expectedSheetCount: 0,
      actualSheetCount: 0,
      expectedRowCount: 0,
      actualRowCount: 0,
      matchedRows: 0,
      missingRows: [],
      extraRows: [],
      summary: `실제 파일을 찾을 수 없습니다: ${actualPath}`,
    }
  }

  // 워크북 로드
  const expectedWorkbook = new ExcelJS.Workbook()
  const actualWorkbook = new ExcelJS.Workbook()

  await expectedWorkbook.xlsx.readFile(expectedPath)
  await actualWorkbook.xlsx.readFile(actualPath)

  const expectedSheet = expectedWorkbook.worksheets[0]
  const actualSheet = actualWorkbook.worksheets[0]

  if (!expectedSheet || !actualSheet) {
    return {
      isMatch: false,
      differences: [],
      expectedSheetCount: expectedWorkbook.worksheets.length,
      actualSheetCount: actualWorkbook.worksheets.length,
      expectedRowCount: 0,
      actualRowCount: 0,
      matchedRows: 0,
      missingRows: [],
      extraRows: [],
      summary: '시트를 찾을 수 없습니다.',
    }
  }

  // 헤더 추출
  const headerRow = opts.headerRow ?? 1
  const expectedHeaders = getRowHeaders(expectedSheet, headerRow)
  const actualHeaders = getRowHeaders(actualSheet, headerRow)

  // 비교할 컬럼 결정
  const columnsToCompare = opts.coreColumns ?? expectedHeaders.filter((h) => h)

  // 데이터 추출
  const expectedData = extractSheetData(expectedSheet, expectedHeaders, headerRow, opts)
  const actualData = extractSheetData(actualSheet, actualHeaders, headerRow, opts)

  const differences: CellDifference[] = []
  const missingRows: RowData[] = []
  const extraRows: RowData[] = []
  let matchedRows = 0

  if (opts.ignoreRowOrder && opts.keyColumn) {
    // 키 컬럼 기준 매칭
    // NOTE: key가 유니크하지 않을 수 있어요(동일 주문번호로 여러 행). 그래서 "1개 매칭"이 아니라 "멀티셋 매칭"으로 처리해요.
    const actualByKey = new Map<string, { row: RowData; index: number }[]>()
    actualData.forEach((row, index) => {
      const key = normalizeFlexibleValue(row[opts.keyColumn!] ?? '', opts)
      if (!key) return
      const list = actualByKey.get(key) ?? []
      list.push({ row, index })
      actualByKey.set(key, list)
    })

    const matchedActualIndices = new Set<number>()

    function isRowMatch(expectedRow: RowData, actualRow: RowData): boolean {
      for (const col of columnsToCompare) {
        const expectedValue = normalizeFlexibleValue(expectedRow[col] ?? '', opts)
        const actualValue = normalizeFlexibleValue(actualRow[col] ?? '', opts)
        if (!flexibleValuesAreEqual(expectedValue, actualValue, opts)) {
          return false
        }
      }
      return true
    }

    for (let i = 0; i < expectedData.length; i++) {
      const expectedRow = expectedData[i]
      const key = normalizeFlexibleValue(expectedRow[opts.keyColumn!] ?? '', opts)

      if (!key) continue

      const candidates = actualByKey.get(key) ?? []
      const unused = candidates.filter((c) => !matchedActualIndices.has(c.index))

      if (unused.length === 0) {
        missingRows.push(expectedRow)
        continue
      }

      const best =
        unused.find((c) => isRowMatch(expectedRow, c.row)) ??
        // 완전 일치가 없으면(동일 key, 값 불일치) 첫 후보를 선택하고 차이점을 기록해요.
        unused[0]!

      matchedActualIndices.add(best.index)
      matchedRows++

      // 핵심 컬럼 비교
      for (const col of columnsToCompare) {
        const expectedValue = normalizeFlexibleValue(expectedRow[col] ?? '', opts)
        const actualValue = normalizeFlexibleValue(best.row[col] ?? '', opts)

        if (!flexibleValuesAreEqual(expectedValue, actualValue, opts)) {
          differences.push({
            address: `Row ${i + headerRow + 1}`,
            expected: expectedValue,
            actual: actualValue,
            sheet: expectedSheet.name,
            row: i + headerRow + 1,
            column: expectedHeaders.indexOf(col) + 1,
            columnName: col,
          })

          if (opts.maxDifferences && differences.length >= opts.maxDifferences) break
        }
      }

      if (opts.maxDifferences && differences.length >= opts.maxDifferences) break
    }

    // 추가된 행 (실제에만 존재)
    actualData.forEach((row, index) => {
      if (!matchedActualIndices.has(index)) {
        extraRows.push(row)
      }
    })
  } else {
    // 순서대로 비교
    const maxRows = Math.max(expectedData.length, actualData.length)

    for (let i = 0; i < maxRows; i++) {
      const expectedRow = expectedData[i]
      const actualRow = actualData[i]

      if (!expectedRow && actualRow) {
        extraRows.push(actualRow)
        continue
      }

      if (expectedRow && !actualRow) {
        missingRows.push(expectedRow)
        continue
      }

      if (!expectedRow || !actualRow) continue

      matchedRows++

      // 핵심 컬럼 비교
      for (const col of columnsToCompare) {
        const expectedValue = normalizeFlexibleValue(expectedRow[col] ?? '', opts)
        const actualValue = normalizeFlexibleValue(actualRow[col] ?? '', opts)

        if (!flexibleValuesAreEqual(expectedValue, actualValue, opts)) {
          differences.push({
            address: `Row ${i + headerRow + 1}`,
            expected: expectedValue,
            actual: actualValue,
            sheet: expectedSheet.name,
            row: i + headerRow + 1,
            column: expectedHeaders.indexOf(col) + 1,
            columnName: col,
          })

          if (opts.maxDifferences && differences.length >= opts.maxDifferences) break
        }
      }

      if (opts.maxDifferences && differences.length >= opts.maxDifferences) break
    }
  }

  const isMatch = differences.length === 0 && missingRows.length === 0 && extraRows.length === 0

  let summary: string
  if (isMatch) {
    summary = `파일이 일치합니다. (${matchedRows}개 행 매칭, ${columnsToCompare.length}개 컬럼 비교)`
  } else {
    const parts: string[] = []
    if (differences.length > 0) parts.push(`${differences.length}개 차이점`)
    if (missingRows.length > 0) parts.push(`${missingRows.length}개 누락 행`)
    if (extraRows.length > 0) parts.push(`${extraRows.length}개 추가 행`)
    summary = parts.join(', ')
  }

  return {
    isMatch,
    differences,
    expectedSheetCount: expectedWorkbook.worksheets.length,
    actualSheetCount: actualWorkbook.worksheets.length,
    expectedRowCount: expectedData.length,
    actualRowCount: actualData.length,
    matchedRows,
    missingRows,
    extraRows,
    summary,
  }
}

/**
 * 비교 결과를 사람이 읽기 좋은 형식으로 출력
 */
export function formatCompareResult(result: CompareResult): string {
  const lines: string[] = []

  lines.push('='.repeat(60))
  lines.push('Excel 파일 비교 결과')
  lines.push('='.repeat(60))
  lines.push('')
  lines.push(`결과: ${result.isMatch ? '✅ 일치' : '❌ 불일치'}`)
  lines.push(`기대 시트 수: ${result.expectedSheetCount}`)
  lines.push(`실제 시트 수: ${result.actualSheetCount}`)
  lines.push(`기대 행 수: ${result.expectedRowCount}`)
  lines.push(`실제 행 수: ${result.actualRowCount}`)
  lines.push('')

  if (result.differences.length > 0) {
    lines.push(`차이점 (${result.differences.length}개):`)
    lines.push('-'.repeat(60))

    for (const diff of result.differences.slice(0, 20)) {
      lines.push(`  [${diff.sheet}] ${diff.address}:`)
      lines.push(`    기대: "${diff.expected}"`)
      lines.push(`    실제: "${diff.actual}"`)
    }

    if (result.differences.length > 20) {
      lines.push(`  ... 외 ${result.differences.length - 20}개`)
    }
  }

  lines.push('')
  lines.push(result.summary)

  return lines.join('\n')
}

/**
 * 유연한 비교 결과 포맷팅
 */
export function formatFlexibleCompareResult(result: FlexibleCompareResult): string {
  const lines: string[] = []

  lines.push('='.repeat(60))
  lines.push('Excel 파일 유연 비교 결과')
  lines.push('='.repeat(60))
  lines.push('')
  lines.push(`결과: ${result.isMatch ? '✅ 일치' : '❌ 불일치'}`)
  lines.push(`기대 행 수: ${result.expectedRowCount}`)
  lines.push(`실제 행 수: ${result.actualRowCount}`)
  lines.push(`매칭된 행 수: ${result.matchedRows}`)
  lines.push('')

  if (result.differences.length > 0) {
    lines.push(`셀 차이점 (${result.differences.length}개):`)
    lines.push('-'.repeat(60))

    for (const diff of result.differences.slice(0, 15)) {
      const colInfo = diff.columnName ? `[${diff.columnName}]` : ''
      lines.push(`  ${diff.address} ${colInfo}:`)
      lines.push(`    기대: "${diff.expected}"`)
      lines.push(`    실제: "${diff.actual}"`)
    }

    if (result.differences.length > 15) {
      lines.push(`  ... 외 ${result.differences.length - 15}개`)
    }
  }

  if (result.missingRows.length > 0) {
    lines.push('')
    lines.push(`누락된 행 (${result.missingRows.length}개):`)
    lines.push('-'.repeat(60))

    for (const row of result.missingRows.slice(0, 5)) {
      const preview = Object.entries(row)
        .slice(0, 3)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
      lines.push(`  ${preview}...`)
    }

    if (result.missingRows.length > 5) {
      lines.push(`  ... 외 ${result.missingRows.length - 5}개`)
    }
  }

  if (result.extraRows.length > 0) {
    lines.push('')
    lines.push(`추가된 행 (${result.extraRows.length}개):`)
    lines.push('-'.repeat(60))

    for (const row of result.extraRows.slice(0, 5)) {
      const preview = Object.entries(row)
        .slice(0, 3)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
      lines.push(`  ${preview}...`)
    }

    if (result.extraRows.length > 5) {
      lines.push(`  ... 외 ${result.extraRows.length - 5}개`)
    }
  }

  lines.push('')
  lines.push(result.summary)

  return lines.join('\n')
}

// ============================================================================
// 유연한 비교 (Flexible Comparison) - 핵심 컬럼만 비교
// ============================================================================

/**
 * Excel 파일에서 특정 열의 값 목록 추출
 */
export async function getColumnValues(filePath: string, columnIndex: number, headerRow = 1): Promise<string[]> {
  if (!fs.existsSync(filePath)) {
    return []
  }

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    return []
  }

  const values: string[] = []

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow) {
      return
    }

    const cell = row.getCell(columnIndex)
    const value = getCellValue(cell)
    if (value) {
      values.push(value)
    }
  })

  return values
}

/**
 * Excel 파일의 헤더 목록 추출
 */
export async function getExcelHeaders(filePath: string, headerRow = 1): Promise<string[]> {
  if (!fs.existsSync(filePath)) {
    return []
  }

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    return []
  }

  return getRowHeaders(worksheet, headerRow)
}

/**
 * Excel 파일의 데이터 행 수 계산
 */
export async function getExcelRowCount(filePath: string, headerRow = 1): Promise<number> {
  if (!fs.existsSync(filePath)) {
    return 0
  }

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    return 0
  }

  // 헤더 행 이후의 데이터 행 수
  return Math.max(0, worksheet.rowCount - headerRow)
}

/**
 * 시트에서 데이터 추출 (헤더 → 값 맵)
 */
function extractSheetData(
  sheet: ExcelJS.Worksheet,
  headers: string[],
  headerRow: number,
  options: FlexibleCompareOptions,
): RowData[] {
  const data: RowData[] = []

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow) return

    const rowData: RowData = {}
    let hasData = false

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber - 1]
      if (header) {
        const value = getCellValue(cell)
        rowData[header] = value
        if (value.trim()) hasData = true
      }
    })

    // 빈 행 무시
    if (hasData || !options.ignoreEmptyCells) {
      data.push(rowData)
    }
  })

  return data
}

/**
 * 유연한 값 비교
 */
function flexibleValuesAreEqual(expected: string, actual: string, options: FlexibleCompareOptions): boolean {
  // 빈 셀 무시
  if (options.ignoreEmptyCells && !expected && !actual) {
    return true
  }

  // 숫자 비교 (허용 오차 적용)
  if (options.numericTolerance !== undefined) {
    const expectedNum = parseFloat(expected)
    const actualNum = parseFloat(actual)

    if (!isNaN(expectedNum) && !isNaN(actualNum)) {
      return Math.abs(expectedNum - actualNum) <= options.numericTolerance
    }
  }

  return expected === actual
}

/**
 * 셀 값을 문자열로 변환
 */
function getCellValue(cell: ExcelJS.Cell): string {
  const value = cell.value

  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'object') {
    // Rich text
    if ('richText' in value) {
      return (value as ExcelJS.CellRichTextValue).richText.map((rt) => rt.text).join('')
    }
    // Hyperlink
    if ('hyperlink' in value && 'text' in value) {
      return String((value as ExcelJS.CellHyperlinkValue).text)
    }
    // Formula
    if ('formula' in value && 'result' in value) {
      return String((value as ExcelJS.CellFormulaValue).result ?? '')
    }
    // Date
    if (value instanceof Date) {
      return value.toISOString()
    }
    // Error
    if ('error' in value) {
      return `#ERROR:${(value as ExcelJS.CellErrorValue).error}`
    }
    return String(value)
  }

  return String(value)
}

/**
 * 시트에서 헤더 행 추출
 */
function getRowHeaders(sheet: ExcelJS.Worksheet, headerRow: number): string[] {
  const headers: string[] = []
  const row = sheet.getRow(headerRow)

  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = getCellValue(cell).trim()
  })

  return headers
}

/**
 * 유연한 값 정규화
 */
function normalizeFlexibleValue(value: string, options: FlexibleCompareOptions): string {
  let normalized = value

  if (options.trimWhitespace) {
    normalized = normalized.trim()
  }

  if (options.ignoreCase) {
    normalized = normalized.toLowerCase()
  }

  // 전화번호 정규화
  if (options.normalizePhoneNumbers) {
    // 전화번호 패턴: 숫자만 추출
    if (/^[\d\s\-\(\)]+$/.test(normalized) && normalized.replace(/\D/g, '').length >= 9) {
      normalized = normalized.replace(/\D/g, '')
    }
  }

  // 주소 정규화
  if (options.normalizeAddresses) {
    // 연속 공백을 단일 공백으로
    normalized = normalized.replace(/\s+/g, ' ')
  }

  // 날짜 정규화 (dateOnly 옵션)
  if (options.dateOnly) {
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
    if (isoDateRegex.test(normalized)) {
      normalized = normalized.split('T')[0]
    }
  }

  return normalized
}

/**
 * 값을 정규화하여 비교 준비
 */
function normalizeValue(value: string, options: CompareOptions): string {
  let normalized = value

  if (options.trimWhitespace) {
    normalized = normalized.trim()
  }

  if (options.ignoreCase) {
    normalized = normalized.toLowerCase()
  }

  // 날짜 정규화 (dateOnly 옵션)
  if (options.dateOnly) {
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
    if (isoDateRegex.test(normalized)) {
      normalized = normalized.split('T')[0]
    }
  }

  return normalized
}

/**
 * 두 값이 같은지 비교
 */
function valuesAreEqual(expected: string, actual: string, options: CompareOptions): boolean {
  const normalizedExpected = normalizeValue(expected, options)
  const normalizedActual = normalizeValue(actual, options)

  // 빈 셀 무시
  if (options.ignoreEmptyCells && !normalizedExpected && !normalizedActual) {
    return true
  }

  // 숫자 비교 (허용 오차 적용)
  if (options.numericTolerance !== undefined) {
    const expectedNum = parseFloat(normalizedExpected)
    const actualNum = parseFloat(normalizedActual)

    if (!isNaN(expectedNum) && !isNaN(actualNum)) {
      return Math.abs(expectedNum - actualNum) <= options.numericTolerance
    }
  }

  return normalizedExpected === normalizedActual
}

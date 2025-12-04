/**
 * Excel 셀 단위 비교 유틸리티
 *
 * 두 Excel 파일을 셀 단위로 비교하고 차이점을 보고합니다.
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

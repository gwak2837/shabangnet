/**
 * 클라이언트용 Excel 유틸리티
 * 브라우저에서 Excel 파일 읽기/쓰기를 위한 함수들
 */

import type ExcelJS from 'exceljs'

/**
 * JSON 데이터를 Excel 파일로 다운로드
 */
export async function downloadExcel(
  data: Record<string, unknown>[],
  options: {
    columnWidths?: number[]
    fileName: string
    sheetName: string
  },
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(options.sheetName)

  if (data.length === 0) {
    throw new Error('다운로드할 데이터가 없습니다')
  }

  // 헤더 추출 (첫 번째 행의 키들)
  const headers = Object.keys(data[0])

  // 헤더 행 추가
  worksheet.addRow(headers)

  // 데이터 행 추가
  for (const row of data) {
    const rowData = headers.map((header) => row[header] ?? '')
    worksheet.addRow(rowData)
  }

  // 컬럼 너비 설정
  if (options.columnWidths) {
    worksheet.columns.forEach((column, index) => {
      if (options.columnWidths && options.columnWidths[index]) {
        column.width = options.columnWidths[index]
      }
    })
  } else {
    // 기본 너비 설정
    worksheet.columns.forEach((column) => {
      column.width = 15
    })
  }

  // Blob으로 변환하여 다운로드
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = options.fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Excel 파일을 JSON 배열로 파싱
 */
export async function parseExcelToJson<T extends Record<string, unknown>>(file: File): Promise<T[]> {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()

  const arrayBuffer = await file.arrayBuffer()
  await workbook.xlsx.load(arrayBuffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    throw new Error('워크시트를 찾을 수 없습니다')
  }

  const headers: string[] = []
  const data: T[] = []

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      // 첫 번째 행 = 헤더
      row.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = getCellValue(cell)
      })
      return
    }

    // 데이터 행
    const rowData: Record<string, unknown> = {}
    let hasContent = false

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber - 1]
      if (header) {
        const value = getCellValue(cell)
        rowData[header] = value

        // 숫자로 변환 가능하면 숫자로
        if (value && !isNaN(Number(value))) {
          rowData[header] = Number(value)
        }

        if (value && String(value).trim()) {
          hasContent = true
        }
      }
    })

    // 빈 행이 아니면 추가
    if (hasContent) {
      data.push(rowData as T)
    }
  })

  return data
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
    // RichText
    if ('richText' in value) {
      return value.richText.map((rt) => rt.text).join('')
    }
    // Hyperlink
    if ('hyperlink' in value && 'text' in value) {
      return String(value.text)
    }
    // Formula
    if ('formula' in value && 'result' in value) {
      return String(value.result ?? '')
    }
    // Date
    if (value instanceof Date) {
      return value.toISOString().split('T')[0]
    }
    return String(value)
  }

  return String(value)
}

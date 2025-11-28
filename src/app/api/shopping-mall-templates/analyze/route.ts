import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'

interface AnalyzeResult {
  detectedHeaderRow: number
  headers: string[]
  previewRows: string[][]
  totalRows: number
}

// 샘플 파일 분석 - 헤더 자동 감지
export async function POST(request: Request): Promise<NextResponse<AnalyzeResult | { error: string }>> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const manualHeaderRow = formData.get('headerRow') as string | null

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })
    }

    // 파일 유효성 검사
    const validExtensions = ['.xlsx', '.xls']
    const fileName = file.name
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()

    if (!validExtensions.includes(ext)) {
      return NextResponse.json({ error: '엑셀 파일(.xlsx, .xls)만 업로드 가능합니다' }, { status: 400 })
    }

    // 파일 읽기
    const buffer = await file.arrayBuffer()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)

    // 첫 번째 시트 사용
    const worksheet = workbook.worksheets[0]
    if (!worksheet) {
      return NextResponse.json({ error: '워크시트를 찾을 수 없습니다' }, { status: 400 })
    }

    // 시트를 2D 배열로 변환
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
      return NextResponse.json({ error: '파일에 데이터가 없습니다' }, { status: 400 })
    }

    // 헤더 행 감지
    let headerRowIndex: number

    if (manualHeaderRow) {
      // 사용자가 지정한 헤더 행 (1-based → 0-based)
      headerRowIndex = parseInt(manualHeaderRow, 10) - 1
      if (headerRowIndex < 0 || headerRowIndex >= data.length) {
        return NextResponse.json({ error: '잘못된 헤더 행 번호입니다' }, { status: 400 })
      }
    } else {
      // 자동 감지: 첫 번째 비어있지 않은 행
      headerRowIndex = findHeaderRow(data)
    }

    const headers = (data[headerRowIndex] || []).map((h) => String(h ?? '').trim()).filter((h) => h !== '')

    // 미리보기 행 (헤더 다음 5행)
    const previewStartIndex = headerRowIndex + 1
    const previewRows = data
      .slice(previewStartIndex, previewStartIndex + 5)
      .map((row) => (row || []).map((cell) => String(cell ?? '').trim()))

    return NextResponse.json({
      detectedHeaderRow: headerRowIndex + 1, // 1-based로 반환
      headers,
      previewRows,
      totalRows: rowCount,
    })
  } catch (error) {
    console.error('File analysis error:', error)
    const errorMessage = error instanceof Error ? error.message : '파일 분석 중 오류가 발생했습니다'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

/**
 * 헤더 행 자동 감지
 * 조건: 비어있지 않은 셀이 3개 이상 있는 첫 번째 행
 */
function findHeaderRow(data: string[][]): number {
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const row = data[i]
    if (!row) continue

    const nonEmptyCells = row.filter((cell) => String(cell ?? '').trim() !== '')

    // 3개 이상의 비어있지 않은 셀이 있으면 헤더로 판단
    if (nonEmptyCells.length >= 3) {
      return i
    }
  }

  // 기본값: 첫 번째 행
  return 0
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
    // Date
    if (value instanceof Date) {
      return value.toISOString().split('T')[0]
    }
    // Formula result
    if ('result' in value) {
      return String(value.result ?? '')
    }
  }

  return String(value)
}

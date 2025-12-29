import ExcelJS from 'exceljs'

import { getCellValue } from './util'

export async function readXlsxFirstSheetRows(buffer: ArrayBuffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    throw new Error('워크시트를 찾을 수 없어요.')
  }

  const columnCount = Math.max(1, worksheet.columnCount || 1)
  const rows: string[][] = []

  worksheet.eachRow({ includeEmpty: true }, (row) => {
    const values: string[] = []
    for (let col = 1; col <= columnCount; col += 1) {
      values.push(getCellValue(row.getCell(col)))
    }
    rows.push(values)
  })

  return rows
}

export async function readXlsxRowsFromFile(file: File): Promise<string[][]> {
  const buffer = await file.arrayBuffer()
  return readXlsxFirstSheetRows(buffer)
}



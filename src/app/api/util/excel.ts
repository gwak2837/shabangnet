import ExcelJS from 'exceljs'

type CellValue = ExcelJS.CellValue

export async function createSimpleXlsxBuffer(params: {
  columnWidths?: number[]
  header: string[]
  rows: CellValue[][]
  sheetName: string
}): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet(params.sheetName)

  worksheet.views = [{ state: 'frozen', ySplit: 1 }]

  if (params.columnWidths) {
    worksheet.columns = params.header.map((_, index) => ({
      width: params.columnWidths?.[index] ?? 15,
    }))
  } else {
    worksheet.columns = params.header.map(() => ({ width: 15 }))
  }

  worksheet.addRow(params.header)
  worksheet.addRows(params.rows)

  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true }
  headerRow.alignment = { vertical: 'middle' }
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    }
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    }
  })

  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: params.header.length },
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  const out = new Uint8Array(bytes.byteLength)
  out.set(bytes)
  return out.buffer
}

export function sanitizeFileNamePart(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, '_')
}

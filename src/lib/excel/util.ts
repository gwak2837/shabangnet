import type { Cell } from 'exceljs'

export function getCellValue(cell: Cell): string {
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
    if ('formula' in value && 'result' in value) {
      return String(value.result ?? '')
    }
    if (value instanceof Date) {
      return value.toISOString().split('T')[0]
    }
    return String(value)
  }

  return String(value)
}

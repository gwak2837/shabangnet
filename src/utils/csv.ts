export interface CsvParseOptions {
  delimiter?: ',' | ';' | '\t'
}

export interface CsvStringifyOptions {
  bom?: boolean
  delimiter?: ',' | ';' | '\t'
}

/**
 * Minimal RFC4180-ish CSV parser that supports:
 * - delimiter autodetect (comma/tab/semicolon) from the first line
 * - quoted fields with escaped quotes ("")
 * - CRLF and LF newlines
 */
export function parseCsv(rawInput: string, options?: CsvParseOptions): string[][] {
  const input = stripUtf8Bom(rawInput)
  const firstLine = input.split(/\r?\n/, 1)[0] ?? ''
  const delimiter = options?.delimiter ?? detectDelimiterFromFirstLine(firstLine)

  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < input.length; i += 1) {
    const c = input[i]

    if (inQuotes) {
      if (c === '"') {
        const next = input[i + 1]
        if (next === '"') {
          field += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
      continue
    }

    if (c === '"') {
      inQuotes = true
      continue
    }

    if (c === delimiter) {
      row.push(field)
      field = ''
      continue
    }

    if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      continue
    }

    if (c === '\r') {
      // Ignore; LF will handle the newline. (CR-only newlines are rare but tolerated.)
      continue
    }

    field += c
  }

  // Flush last field/row (including trailing empty field)
  row.push(field)
  rows.push(row)

  return rows
}

export function stringifyCsv(rows: readonly (readonly string[])[], options?: CsvStringifyOptions): string {
  const delimiter = options?.delimiter ?? ','
  const lines = rows.map((row) => row.map((cell) => escapeCsvCell(cell, delimiter)).join(delimiter)).join('\n')
  return options?.bom ? `\uFEFF${lines}` : lines
}

export function stripUtf8Bom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

function countChar(text: string, char: string): number {
  let count = 0
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === char) count += 1
  }
  return count
}

function detectDelimiterFromFirstLine(firstLine: string): ',' | ';' | '\t' {
  const commaCount = countChar(firstLine, ',')
  const tabCount = countChar(firstLine, '\t')
  const semicolonCount = countChar(firstLine, ';')

  if (tabCount > commaCount && tabCount > semicolonCount) return '\t'
  if (semicolonCount > commaCount && semicolonCount > tabCount) return ';'
  return ','
}

function escapeCsvCell(cell: string, delimiter: string): string {
  const raw = cell
  const needsQuotes =
    raw.includes('"') ||
    raw.includes('\n') ||
    raw.includes('\r') ||
    raw.includes(delimiter) ||
    raw.startsWith(' ') ||
    raw.endsWith(' ')

  if (!needsQuotes) return raw

  const escaped = raw.replaceAll('"', '""')
  return `"${escaped}"`
}

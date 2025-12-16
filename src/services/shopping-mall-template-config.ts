export interface ShoppingMallTemplateColumnConfig {
  columnMappings: Record<string, string>
  fixedValues: Record<string, string>
}

export function parseShoppingMallTemplateColumnConfig(raw: unknown): ShoppingMallTemplateColumnConfig {
  if (!isRecord(raw)) {
    return { columnMappings: {}, fixedValues: {} }
  }

  if (!('columnMappings' in raw)) {
    return { columnMappings: {}, fixedValues: {} }
  }

  const columnMappings = toStringRecord(raw.columnMappings)
  const fixedValues = 'fixedValues' in raw ? toStringRecord(raw.fixedValues) : {}
  return { columnMappings, fixedValues }
}

export function stringifyShoppingMallTemplateColumnConfig(input: ShoppingMallTemplateColumnConfig): string {
  const fixedValues: Record<string, string> = {}
  for (const [k, v] of Object.entries(input.fixedValues)) {
    const trimmed = v.trim()
    if (trimmed.length > 0) {
      fixedValues[k] = trimmed
    }
  }

  return JSON.stringify({
    columnMappings: input.columnMappings,
    fixedValues,
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toStringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === 'string') {
      out[k] = v
    }
  }
  return out
}

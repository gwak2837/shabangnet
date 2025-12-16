import { SABANGNET_COLUMN_MAP } from '@/common/constants'

export interface FixedValueEntry {
  fieldKey: string
  value: string
}

export function formatSabangnetFieldLabels(fieldKeys: string[]): string {
  return fieldKeys
    .map((fieldKey) => getSabangnetFieldLabel(fieldKey))
    .filter((label) => label.trim().length > 0)
    .join(', ')
}

export function getDuplicateFieldKeys(args: {
  columnMappings: Record<string, string>
  fixedValues?: Record<string, string>
}): string[] {
  const counts = new Map<string, number>()

  for (const fieldKey of Object.values(args.columnMappings)) {
    if (fieldKey.trim().length === 0) continue
    counts.set(fieldKey, (counts.get(fieldKey) ?? 0) + 1)
  }

  for (const fieldKey of getNonEmptyFixedValueKeys(args.fixedValues)) {
    counts.set(fieldKey, (counts.get(fieldKey) ?? 0) + 1)
  }

  return [...counts.entries()].filter(([, count]) => count > 1).map(([fieldKey]) => fieldKey)
}

export function getMissingRequiredFieldKeys(
  requiredFieldKeys: string[],
  args: { columnMappings: Record<string, string>; fixedValues?: Record<string, string> },
): string[] {
  const satisfied = new Set<string>()

  for (const fieldKey of Object.values(args.columnMappings)) {
    if (fieldKey.trim().length > 0) {
      satisfied.add(fieldKey)
    }
  }

  for (const fieldKey of getNonEmptyFixedValueKeys(args.fixedValues)) {
    satisfied.add(fieldKey)
  }

  return requiredFieldKeys.filter((fieldKey) => !satisfied.has(fieldKey))
}

export function getNonEmptyFixedValueEntries(fixedValues: Record<string, string> | undefined): FixedValueEntry[] {
  if (!fixedValues) return []
  return Object.entries(fixedValues)
    .map(([fieldKey, rawValue]) => ({ fieldKey, value: rawValue }))
    .filter((e) => e.value.trim().length > 0)
    .sort((a, b) => a.fieldKey.localeCompare(b.fieldKey))
}

export function getNonEmptyFixedValueKeys(fixedValues: Record<string, string> | undefined): Set<string> {
  return new Set(getNonEmptyFixedValueEntries(fixedValues).map((e) => e.fieldKey))
}

export function getSabangnetFieldLabel(fieldKey: string): string {
  return SABANGNET_COLUMN_MAP.get(fieldKey)?.label ?? fieldKey
}

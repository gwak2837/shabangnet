'use client'

import { AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import type { AvailableColumn } from './available-column'

import { SABANGNET_COLUMNS_REQUIRED_FIRST } from './util/sabangnet-columns-required-first'
import { formatSabangnetFieldLabels, getNonEmptyFixedValueKeys } from './util/sabangnet-field-utils'

interface ColumnMappingEditorProps {
  availableColumns: AvailableColumn[]
  fixedValues?: Record<string, string>
  missingRequiredLabels?: string
  onChange: (next: Record<string, string>) => void
  previewRows: string[][]
  value: Record<string, string>
}

interface MappingRowModel {
  canMap: boolean
  columnIndex?: number
  columnLetter?: string
  headerKey: string
  headerLabel: string
  key: RowKey
  mappingValue: string
  previewValues: string[]
  warning?: string
}

type RowKey = `col:${number}` | `missing:${string}`

export function ColumnMappingEditor({
  availableColumns,
  fixedValues,
  missingRequiredLabels,
  previewRows,
  value,
  onChange,
}: ColumnMappingEditorProps) {
  const [hiddenRows, setHiddenRows] = useState<Set<RowKey>>(() => new Set<RowKey>())
  const [restoreSelectKey, setRestoreSelectKey] = useState(0)

  const rows = useMemo<MappingRowModel[]>(() => {
    const hasAnalyzedColumns = availableColumns.length > 0
    const effectiveColumns = getEffectiveColumns(availableColumns, previewRows)

    const headerFirstColumnIndex = new Map<string, number>()
    for (const col of effectiveColumns) {
      const headerKey = normalizeHeader(col.header)
      if (!headerKey) continue
      if (!headerFirstColumnIndex.has(headerKey)) {
        headerFirstColumnIndex.set(headerKey, col.columnIndex)
      }
    }

    const availableHeaderKeys = new Set<string>()
    for (const col of effectiveColumns) {
      const headerKey = normalizeHeader(col.header)
      if (headerKey) availableHeaderKeys.add(headerKey)
    }

    const mappedRows: MappingRowModel[] = effectiveColumns.map((col) => {
      const headerKey = normalizeHeader(col.header)
      const headerLabel = headerKey.length > 0 ? headerKey : '(빈 헤더)'
      const isBlankHeader = headerKey.length === 0
      const firstIndex = headerKey ? headerFirstColumnIndex.get(headerKey) : undefined
      const isDuplicateHeader = headerKey.length > 0 && firstIndex !== undefined && firstIndex !== col.columnIndex

      const canMap = !isBlankHeader && !isDuplicateHeader
      const mappingValue = headerKey && value[headerKey] ? value[headerKey]! : '_none'

      let warning: string | undefined
      if (isBlankHeader) {
        warning = '헤더가 비어 있어서 연결할 수 없어요'
      } else if (isDuplicateHeader) {
        warning = '중복 헤더예요. 첫 번째 컬럼만 연결돼요'
      }

      return {
        key: `col:${col.columnIndex}`,
        canMap,
        columnIndex: col.columnIndex,
        columnLetter: col.columnLetter,
        headerKey,
        headerLabel,
        mappingValue,
        previewValues: getPreviewValues(previewRows, col.columnIndex),
        warning,
      }
    })

    const missingHeaders = Object.keys(value).filter((headerKey) => !availableHeaderKeys.has(headerKey))

    const missingRows: MappingRowModel[] = missingHeaders.map((headerKey) => ({
      key: `missing:${headerKey}`,
      canMap: !hasAnalyzedColumns,
      headerKey,
      headerLabel: headerKey,
      mappingValue: value[headerKey] ?? '_none',
      previewValues: [''],
      warning: hasAnalyzedColumns ? '예시 파일에 없는 헤더예요. 변환 시 오류가 날 수 있어요' : undefined,
    }))

    return [...mappedRows, ...missingRows]
  }, [availableColumns, previewRows, value])

  const visibleRows = useMemo(() => rows.filter((row) => !hiddenRows.has(row.key)), [rows, hiddenRows])

  const headersByField = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const [headerKey, fieldKey] of Object.entries(value)) {
      const next = map.get(fieldKey) ?? []
      next.push(headerKey)
      map.set(fieldKey, next)
    }
    return map
  }, [value])

  const duplicateFieldKeys = useMemo(() => {
    const out: string[] = []
    for (const [fieldKey, headers] of headersByField.entries()) {
      if (headers.length > 1) out.push(fieldKey)
    }
    return out
  }, [headersByField])

  const duplicateFieldLabels = useMemo(() => {
    return formatSabangnetFieldLabels(duplicateFieldKeys)
  }, [duplicateFieldKeys])

  const fixedFieldKeySet = useMemo(() => {
    return getNonEmptyFixedValueKeys(fixedValues)
  }, [fixedValues])

  const hiddenCandidates = useMemo(() => {
    if (hiddenRows.size === 0) return []
    return rows.filter((row) => hiddenRows.has(row.key))
  }, [rows, hiddenRows])

  function updateMapping(headerKey: string, fieldKey: string) {
    const next = { ...value }
    if (fieldKey === '_none') {
      delete next[headerKey]
    } else {
      next[headerKey] = fieldKey
    }
    onChange(next)
  }

  function hideRow(row: MappingRowModel) {
    setHiddenRows((prev) => {
      const next = new Set(prev)
      next.add(row.key)
      return next
    })

    const shouldUnmap = row.canMap || row.key.startsWith('missing:')
    if (row.headerKey && shouldUnmap) {
      updateMapping(row.headerKey, '_none')
    }
  }

  function restoreRow(rowKey: RowKey) {
    setHiddenRows((prev) => {
      const next = new Set(prev)
      next.delete(rowKey)
      return next
    })
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-sm font-medium">컬럼 연결</Label>
          <p className="text-xs text-muted-foreground">예시 데이터를 보면서 어떤 컬럼을 어디에 넣을지 정해요.</p>
          {missingRequiredLabels && <p className="text-xs text-amber-600">필수 필드 미연결: {missingRequiredLabels}</p>}
        </div>

        <div className="flex items-center gap-2">
          <Select
            disabled={hiddenCandidates.length === 0}
            key={restoreSelectKey}
            onValueChange={(v) => {
              restoreRow(v as RowKey)
              setRestoreSelectKey((prev) => prev + 1)
            }}
          >
            <SelectTrigger aria-disabled={hiddenCandidates.length === 0} className="aria-disabled:opacity-50" size="sm">
              <SelectValue
                placeholder={
                  hiddenCandidates.length > 0
                    ? `삭제한 컬럼 ${hiddenCandidates.length}개 다시 추가`
                    : '삭제한 컬럼이 없어요'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {hiddenCandidates.map((row) => (
                <SelectItem key={row.key} value={row.key}>
                  <span className="text-muted-foreground">추가:</span> {formatColumnLabel(row)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            aria-disabled={hiddenRows.size === 0}
            className="aria-disabled:opacity-50"
            onClick={() => setHiddenRows(new Set<RowKey>())}
            size="sm"
            type="button"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            전체 표시
          </Button>
        </div>
      </div>

      {duplicateFieldKeys.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/5 px-3 py-2 text-xs text-destructive ring-1 ring-destructive/15">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div>
            <p className="font-medium">사방넷 컬럼이 중복 연결됐어요</p>
            <p className="mt-0.5 text-destructive/90">중복: {duplicateFieldLabels}</p>
          </div>
        </div>
      )}

      <div className="rounded-md bg-background ring-1 ring-border/50">
        {visibleRows.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">컬럼이 없어요</div>
        ) : (
          <Table className="table-fixed">
            <colgroup>
              <col className="w-[220px]" />
              <col className="w-[220px]" />
              <col className="w-[220px]" />
              <col className="w-[80px]" />
            </colgroup>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium text-muted-foreground">쇼핑몰 파일 컬럼</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">예시 행</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">사방넷 컬럼</TableHead>
                <TableHead className="text-center text-xs font-medium text-muted-foreground">관리</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-border/50">
              {visibleRows.map((row) => {
                const isMapped = row.mappingValue !== '_none'
                const isDuplicateField = isMapped && (headersByField.get(row.mappingValue)?.length ?? 0) > 1
                const disabledSelect = !row.canMap

                return (
                  <TableRow className="hover:bg-transparent" key={row.key}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium text-foreground">
                          {row.columnLetter ? (
                            <>
                              <span className="text-muted-foreground font-mono">{row.columnLetter}</span>
                              <span className="mx-1 text-muted-foreground">·</span>
                            </>
                          ) : null}
                          {row.headerLabel}
                        </p>
                        {row.warning && <p className="text-xs text-muted-foreground">{row.warning}</p>}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        {row.previewValues.map((v, idx) => (
                          <p className="line-clamp-1 text-xs text-muted-foreground" key={idx}>
                            {v || <span className="text-muted-foreground/60">(빈 값)</span>}
                          </p>
                        ))}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Select
                        onValueChange={(fieldKey) => {
                          if (!row.headerKey) return
                          updateMapping(row.headerKey, fieldKey)
                        }}
                        value={row.headerKey ? (value[row.headerKey] ?? '_none') : '_none'}
                      >
                        <SelectTrigger
                          aria-disabled={disabledSelect}
                          aria-invalid={isDuplicateField}
                          className="w-full aria-disabled:opacity-50"
                        >
                          <SelectValue placeholder="선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">
                            <span className="text-muted-foreground">연결 안함</span>
                          </SelectItem>
                          {SABANGNET_COLUMNS_REQUIRED_FIRST.map((field) => {
                            const usedElsewhere = (headersByField.get(field.key) ?? []).some((h) => h !== row.headerKey)
                            const isSelectedHere = row.headerKey
                              ? (value[row.headerKey] ?? '_none') === field.key
                              : false
                            const usedByFixedValue = fixedFieldKeySet.has(field.key) && !isSelectedHere
                            const disabled = usedElsewhere || usedByFixedValue
                            return (
                              <SelectItem disabled={disabled} key={field.key} value={field.key}>
                                {field.label}
                                {field.required && <span className="ml-1 text-destructive">*</span>}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                      {isDuplicateField && (
                        <p className="mt-1 text-xs text-destructive">중복 연결이에요. 하나만 남겨 주세요.</p>
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      <Button onClick={() => hideRow(row)} size="icon-sm" title="행 삭제" type="button" variant="ghost">
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  )
}

function formatColumnLabel(column: { columnLetter?: string; headerLabel: string }): string {
  const letter = column.columnLetter ? `${column.columnLetter} · ` : ''
  return `${letter}${column.headerLabel}`
}

function getEffectiveColumns(availableColumns: AvailableColumn[], previewRows: string[][]): AvailableColumn[] {
  if (availableColumns.length === 0) return []

  let lastUsed = 0
  for (const col of availableColumns) {
    const header = normalizeHeader(col.header)
    const hasHeader = header.length > 0
    const hasPreview = previewRows.some((row) => String(row?.[col.columnIndex - 1] ?? '').trim().length > 0)
    if (hasHeader || hasPreview) {
      lastUsed = Math.max(lastUsed, col.columnIndex)
    }
  }

  // If we couldn't detect a boundary, keep as-is (better than hiding data unexpectedly).
  if (lastUsed === 0) return availableColumns
  return availableColumns.filter((c) => c.columnIndex <= lastUsed)
}

function getPreviewValues(previewRows: string[][], columnIndex: number): string[] {
  const firstRow = previewRows[0]
  const value = String(firstRow?.[columnIndex - 1] ?? '').trim()
  return [value]
}

function normalizeHeader(header: string): string {
  return header.trim()
}

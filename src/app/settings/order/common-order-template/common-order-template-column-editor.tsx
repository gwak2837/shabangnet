'use client'

import { useMemo } from 'react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { TemplateTokenInput, type TemplateTokenOption } from './template-token-input'

export type CommonTemplateColumnRule =
  | { kind: 'field'; fieldKey: string }
  | { kind: 'none' }
  | { kind: 'template'; template: string }

export interface CommonTemplateFieldOption {
  key: string
  label: string
}

interface CommonOrderTemplateColumnEditorProps {
  fieldOptions: CommonTemplateFieldOption[]
  headers: string[]
  lastUsedColumnIndex?: number
  onApplySuggestions?: () => void
  onChange: (next: Record<string, CommonTemplateColumnRule>) => void
  sampleData?: Record<string, string>[]
  suggestionsCount?: number
  tokens: TemplateTokenOption[]
  value: Record<string, CommonTemplateColumnRule>
}

export function CommonOrderTemplateColumnEditor({
  headers,
  lastUsedColumnIndex,
  fieldOptions,
  value,
  onChange,
  tokens,
  onApplySuggestions,
  sampleData = [],
  suggestionsCount = 0,
}: CommonOrderTemplateColumnEditorProps) {
  const maxConfiguredIndex = useMemo(() => {
    let max = 0
    for (const col of Object.keys(value)) {
      const idx = columnLetterToIndex(col)
      if (idx >= 0) max = Math.max(max, idx + 1)
    }
    return max
  }, [value])

  const maxIndex = useMemo(() => {
    const headerMax = lastUsedColumnIndex ? Math.max(0, lastUsedColumnIndex) : headers.length
    return Math.max(headerMax, maxConfiguredIndex)
  }, [headers.length, lastUsedColumnIndex, maxConfiguredIndex])

  const columns = useMemo(() => {
    const items: { columnLetter: string; headerLabel: string }[] = []
    for (let i = 0; i < maxIndex; i++) {
      const columnLetter = indexToColumnLetter(i)
      const headerLabel = String(headers[i] ?? '').trim()
      items.push({ columnLetter, headerLabel })
    }
    return items
  }, [headers, maxIndex])

  const columnsWithSampleValues = useMemo(() => {
    const set = new Set<string>()
    for (const row of sampleData) {
      for (const [col, rawValue] of Object.entries(row)) {
        const value = String(rawValue ?? '').trim()
        if (value.length > 0) {
          set.add(col.trim().toUpperCase())
        }
      }
    }
    return set
  }, [sampleData])

  const visibleColumns = useMemo(() => {
    return columns.filter((col) => {
      const configured = value[col.columnLetter]?.kind && value[col.columnLetter]!.kind !== 'none'
      const hasHeader = col.headerLabel.length > 0
      const hasSample = columnsWithSampleValues.has(col.columnLetter)
      return configured || hasHeader || hasSample
    })
  }, [columns, columnsWithSampleValues, value])

  const { columnsByFieldKey, duplicateFieldLabels } = useMemo(() => {
    const fieldToColumns = new Map<string, string[]>()
    for (const [col, rule] of Object.entries(value)) {
      if (rule.kind !== 'field') continue
      const next = fieldToColumns.get(rule.fieldKey) ?? []
      next.push(col)
      fieldToColumns.set(rule.fieldKey, next)
    }

    const duplicates: string[] = []
    for (const [fieldKey, cols] of fieldToColumns.entries()) {
      if (cols.length > 1) {
        const label = fieldOptions.find((f) => f.key === fieldKey)?.label ?? fieldKey
        duplicates.push(label)
      }
    }

    return { columnsByFieldKey: fieldToColumns, duplicateFieldLabels: duplicates }
  }, [fieldOptions, value])

  function setRule(columnLetter: string, nextRule: CommonTemplateColumnRule) {
    const normalized = columnLetter.trim().toUpperCase()
    const next = { ...value, [normalized]: nextRule }
    onChange(next)
  }

  function updateSelectValue(columnLetter: string, selectValue: string) {
    if (selectValue === '_none') {
      setRule(columnLetter, { kind: 'none' })
      return
    }

    if (selectValue === '_template') {
      const existing = value[columnLetter]
      const template = existing?.kind === 'template' ? existing.template : ''
      setRule(columnLetter, { kind: 'template', template })
      return
    }

    setRule(columnLetter, { kind: 'field', fieldKey: selectValue })
  }

  function updateTemplate(columnLetter: string, template: string) {
    setRule(columnLetter, { kind: 'template', template })
  }

  return (
    <section className="space-y-3 rounded-lg bg-muted/30 p-4 ring-1 ring-border/30">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-sm font-medium">템플릿 컬럼 채우기</Label>
          {duplicateFieldLabels.length > 0 ? (
            <p className="text-xs text-amber-700">
              같은 필드가 여러 컬럼에 연결돼 있어요: {duplicateFieldLabels.join(', ')}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onApplySuggestions ? (
            <Button
              aria-disabled={suggestionsCount === 0}
              disabled={suggestionsCount === 0}
              onClick={onApplySuggestions}
              size="sm"
              type="button"
              variant="outline"
            >
              추천 연결 적용{suggestionsCount > 0 ? ` (${suggestionsCount}개)` : ''}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-md bg-background ring-1 ring-border/50">
        {visibleColumns.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            분석된 컬럼이 없어요. 템플릿 파일을 업로드해 주세요.
          </div>
        ) : (
          <Table className="table-fixed w-max min-w-full">
            <colgroup>
              <col className="w-[220px]" />
              <col className="w-[260px]" />
              <col />
            </colgroup>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium text-muted-foreground">템플릿 컬럼</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">값</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">직접 입력/조합</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/50">
              {visibleColumns.map((col) => {
                const rule = value[col.columnLetter] ?? { kind: 'none' as const }
                const selectValue =
                  rule.kind === 'field' ? rule.fieldKey : rule.kind === 'template' ? '_template' : '_none'
                const headerLabel = col.headerLabel.length > 0 ? col.headerLabel : '(빈 헤더)'
                const isTemplate = rule.kind === 'template'

                return (
                  <TableRow className="hover:bg-transparent" key={col.columnLetter}>
                    <TableCell className="align-top">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium text-foreground">
                          <span className="font-mono text-muted-foreground">{col.columnLetter}</span>
                          <span className="mx-1 text-muted-foreground">·</span>
                          {headerLabel}
                        </p>
                        {col.headerLabel.length > 0 ? (
                          <p className="text-xs text-muted-foreground">헤더: {col.headerLabel}</p>
                        ) : null}
                      </div>
                    </TableCell>

                    <TableCell className="align-top">
                      <Select onValueChange={(v) => updateSelectValue(col.columnLetter, v)} value={selectValue}>
                        <SelectTrigger className="w-full" size="sm">
                          <SelectValue placeholder="선택해요" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">
                            <span className="text-muted-foreground">비워두기</span>
                          </SelectItem>
                          <SelectItem value="_template">직접 입력/조합</SelectItem>
                          {fieldOptions.map((f) => (
                            <SelectItem
                              disabled={
                                !(rule.kind === 'field' && rule.fieldKey === f.key) &&
                                (columnsByFieldKey.get(f.key)?.length ?? 0) > 0
                              }
                              key={f.key}
                              value={f.key}
                            >
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    <TableCell className="align-top">
                      {isTemplate ? (
                        <TemplateTokenInput
                          onChange={(next) => updateTemplate(col.columnLetter, next)}
                          placeholder="예: {{받는인}}(보내는 분: {{주문인 || 받는인}})"
                          rows={2}
                          tokens={tokens}
                          value={rule.template}
                        />
                      ) : (
                        <p className="pt-2 text-xs text-muted-foreground">
                          직접 입력/조합을 선택하면 여기서 편집할 수 있어요.
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </section>
  )
}

function columnLetterToIndex(column: string): number {
  const normalized = column.trim().toUpperCase()
  if (!/^[A-Z]+$/.test(normalized)) return -1

  let index = 0
  for (let i = 0; i < normalized.length; i++) {
    index *= 26
    index += normalized.charCodeAt(i) - 64
  }
  return index - 1
}

function indexToColumnLetter(index: number): string {
  let letter = ''
  let i = index
  while (i >= 0) {
    letter = String.fromCharCode((i % 26) + 65) + letter
    i = Math.floor(i / 26) - 1
  }
  return letter
}

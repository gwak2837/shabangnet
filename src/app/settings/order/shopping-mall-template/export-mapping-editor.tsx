'use client'

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { ShoppingMallExportConfigV1 } from '@/services/shopping-mall-templates'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface AvailableColumn {
  columnIndex: number
  columnLetter: string
  header: string
}

interface ExportMappingEditorProps {
  availableColumns: AvailableColumn[]
  onChange: (next: ShoppingMallExportConfigV1 | null) => void
  value: ShoppingMallExportConfigV1 | null
}

interface ExportMappingRowProps {
  column: NonNullable<ShoppingMallExportConfigV1>['columns'][number] & { id: string }
  columnMap: Map<number, AvailableColumn>
  effectiveAvailableColumns: AvailableColumn[]
  index: number
  total: number
  updateExportConfig: (updater: (prev: ShoppingMallExportConfigV1) => ShoppingMallExportConfigV1) => void
}

export function ExportMappingEditor({ availableColumns, value, onChange }: ExportMappingEditorProps) {
  const exportConfig = value
  const effectiveAvailableColumns = useMemo(
    () => (availableColumns.length > 0 ? availableColumns : createFallbackColumnsFromConfig(exportConfig)),
    [availableColumns, exportConfig],
  )
  const columnMap = useMemo(
    () => new Map(effectiveAvailableColumns.map((c) => [c.columnIndex, c])),
    [effectiveAvailableColumns],
  )
  const hasAnalyzedColumns = availableColumns.length > 0

  const exportConfigRef = useRef(exportConfig)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    exportConfigRef.current = exportConfig
  }, [exportConfig])

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Ensure stable row keys (id) so row-local state doesn't jump on reorder.
  useEffect(() => {
    if (!exportConfig) return

    const missingIds = exportConfig.columns.some((col) => !col.id)
    if (!missingIds) return

    const next: ShoppingMallExportConfigV1 = {
      ...exportConfig,
      columns: exportConfig.columns.map((col) => ({
        ...col,
        id: col.id ?? crypto.randomUUID(),
      })),
    }

    onChangeRef.current(next)
  }, [exportConfig])

  const updateExportConfig = useCallback(
    (updater: (prev: ShoppingMallExportConfigV1) => ShoppingMallExportConfigV1) => {
      const current = exportConfigRef.current
      if (!current) return
      onChangeRef.current(updater(current))
    },
    [],
  )

  const exportConfigReady = exportConfig ? exportConfig.columns.every((col) => Boolean(col.id)) : true

  if (exportConfig && !exportConfigReady) {
    return (
      <section className="space-y-3 rounded-lg bg-muted/30 p-4 ring-1 ring-border/30">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">다운로드 엑셀 템플릿</p>
          <p className="text-xs text-muted-foreground">템플릿을 준비하고 있어요.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-3 rounded-lg bg-muted/30 p-4 ring-1 ring-border/30">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">다운로드 엑셀 템플릿</p>
        <p className="text-xs text-muted-foreground">
          업로드된 원본 파일을 다운로드용 엑셀 형식으로 변환합니다. (중복 포함, 파싱 오류 행 제외)
        </p>
      </div>

      <div className="space-y-2">
        {!hasAnalyzedColumns && (
          <p className="text-sm text-muted-foreground">
            샘플 파일을 업로드하면 원본 컬럼 전체 목록을 불러올 수 있어요.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            aria-disabled={effectiveAvailableColumns.length === 0}
            className="aria-disabled:opacity-50"
            onClick={() => onChange(createIdentityConfig(effectiveAvailableColumns))}
            type="button"
            variant="outline"
          >
            원본 컬럼으로 자동 생성
          </Button>
          <Button onClick={() => onChange(null)} type="button" variant="ghost">
            초기화
          </Button>
        </div>
      </div>

      {exportConfig && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium" htmlFor="export-copy-prefix">
                헤더 위 행 유지
              </Label>
              <Switch
                checked={exportConfig.copyPrefixRows ?? true}
                id="export-copy-prefix"
                onCheckedChange={(checked) =>
                  onChange({
                    ...exportConfig,
                    copyPrefixRows: checked,
                  })
                }
              />
            </div>

            <Button
              onClick={() =>
                updateExportConfig((prev) => ({
                  ...prev,
                  columns: [
                    ...prev.columns,
                    { id: crypto.randomUUID(), header: '', source: { type: 'const', value: '' } },
                  ],
                }))
              }
              type="button"
              variant="outline"
            >
              <Plus />빈 컬럼 추가
            </Button>
          </div>

          <div className="rounded-md bg-background ring-1 ring-border/50">
            {exportConfig.columns.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">컬럼이 없어요</div>
            ) : (
              <Table className="table-fixed">
                <colgroup>
                  <col className="w-12" />
                  <col className="w-[260px]" />
                  <col className="w-[260px]" />
                  <col className="w-[160px]" />
                  <col className="w-[160px]" />
                </colgroup>
                <TableHeader className="bg-muted/40">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-center text-xs font-medium text-muted-foreground">#</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">출력 헤더</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">원본 컬럼</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">고정값</TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/50">
                  {(exportConfig.columns as ExportMappingRowProps['column'][]).map((col, index) => (
                    <ExportMappingRow
                      column={col}
                      columnMap={columnMap}
                      effectiveAvailableColumns={effectiveAvailableColumns}
                      index={index}
                      key={col.id ?? index}
                      total={exportConfig.columns.length}
                      updateExportConfig={updateExportConfig}
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function createFallbackColumnsFromConfig(exportConfig: ShoppingMallExportConfigV1 | null): AvailableColumn[] {
  if (!exportConfig) return []

  const seen = new Set<number>()
  const out: AvailableColumn[] = []

  for (const col of exportConfig.columns) {
    if (col.source.type !== 'input') continue
    if (seen.has(col.source.columnIndex)) continue
    seen.add(col.source.columnIndex)

    out.push({
      columnIndex: col.source.columnIndex,
      columnLetter: indexToColumnLetter(col.source.columnIndex - 1),
      header: col.header ?? '',
    })
  }

  out.sort((a, b) => a.columnIndex - b.columnIndex)
  return out
}

function createIdentityConfig(availableColumns: AvailableColumn[]): ShoppingMallExportConfigV1 {
  return {
    version: 1,
    copyPrefixRows: true,
    columns: availableColumns.map((col) => ({
      id: crypto.randomUUID(),
      source: { type: 'input' as const, columnIndex: col.columnIndex },
    })),
  }
}

function ExportMappingRow({
  column,
  columnMap,
  effectiveAvailableColumns,
  index,
  total,
  updateExportConfig,
}: ExportMappingRowProps) {
  const canMoveUp = index > 0
  const canMoveDown = index < total - 1

  const colId = column.id

  const defaultHeader = getDefaultHeader(column, columnMap)
  const [headerInput, setHeaderInput] = useState(column.header ?? '')

  const isConst = column.source.type === 'const'
  const initialConstValue = column.source.type === 'const' ? column.source.value : ''
  const [constValueInput, setConstValueInput] = useState(initialConstValue)

  const selectedSourceValue = column.source.type === 'input' ? `input:${column.source.columnIndex}` : 'const'

  const sourceLabel =
    column.source.type === 'input'
      ? `${columnMap.get(column.source.columnIndex)?.columnLetter ?? '?'}: ${
          columnMap.get(column.source.columnIndex)?.header || '(빈 헤더)'
        }`
      : '고정값'

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="text-center text-xs text-muted-foreground tabular-nums">{index + 1}</TableCell>

      <TableCell>
        <div className="flex min-w-0 items-center gap-2">
          <Input
            onBlur={() => {
              updateExportConfig((prev) => ({
                ...prev,
                columns: prev.columns.map((c) => (c.id === colId ? { ...c, header: headerInput } : c)),
              }))
            }}
            onChange={(e) => setHeaderInput(e.target.value)}
            placeholder={defaultHeader || '(빈 헤더)'}
            value={headerInput}
          />
          <Button
            aria-disabled={column.header === undefined}
            className="shrink-0 aria-disabled:opacity-40"
            onClick={() => {
              if (column.header === undefined) return
              setHeaderInput('')
              updateExportConfig((prev) => ({
                ...prev,
                columns: prev.columns.map((c) => {
                  if (c.id !== colId) return c
                  const nextColumn = { ...c }
                  delete nextColumn.header
                  return nextColumn
                }),
              }))
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            기본값
          </Button>
        </div>
      </TableCell>

      <TableCell>
        <Select
          onValueChange={(v) => {
            updateExportConfig((prev) => {
              const nextColumns = prev.columns.map((c) => {
                if (c.id !== colId) return c

                if (v === 'const') {
                  return { ...c, source: { type: 'const' as const, value: constValueInput } }
                }

                const [, rawColumnIndex] = v.split(':')
                const columnIndex = Number(rawColumnIndex)
                if (!Number.isFinite(columnIndex) || columnIndex < 1) {
                  return c
                }

                return { ...c, source: { type: 'input' as const, columnIndex } }
              })

              return { ...prev, columns: nextColumns }
            })
          }}
          value={selectedSourceValue}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={sourceLabel} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="const">
              <span className="text-muted-foreground">고정값</span>
            </SelectItem>
            {effectiveAvailableColumns.map((c) => (
              <SelectItem key={c.columnIndex} value={`input:${c.columnIndex}`}>
                {c.columnLetter}: {c.header || '(빈 헤더)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      <TableCell>
        {isConst ? (
          <Input
            onBlur={() => {
              updateExportConfig((prev) => ({
                ...prev,
                columns: prev.columns.map((c) =>
                  c.id === colId && c.source.type === 'const'
                    ? { ...c, source: { type: 'const' as const, value: constValueInput } }
                    : c,
                ),
              }))
            }}
            onChange={(e) => setConstValueInput(e.target.value)}
            placeholder="(빈 값)"
            value={constValueInput}
          />
        ) : (
          <div className="text-sm text-muted-foreground">-</div>
        )}
      </TableCell>

      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            aria-disabled={!canMoveUp}
            className="aria-disabled:opacity-40"
            onClick={() => {
              if (!canMoveUp) return
              updateExportConfig((prev) => {
                const next = [...prev.columns]
                const tmp = next[index - 1]
                next[index - 1] = next[index]
                next[index] = tmp
                return { ...prev, columns: next }
              })
            }}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <ArrowUp />
          </Button>
          <Button
            aria-disabled={!canMoveDown}
            className="aria-disabled:opacity-40"
            onClick={() => {
              if (!canMoveDown) return
              updateExportConfig((prev) => {
                const next = [...prev.columns]
                const tmp = next[index + 1]
                next[index + 1] = next[index]
                next[index] = tmp
                return { ...prev, columns: next }
              })
            }}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <ArrowDown />
          </Button>
          <Button
            onClick={() => {
              updateExportConfig((prev) => {
                const next = [...prev.columns]
                next.splice(index + 1, 0, { id: crypto.randomUUID(), header: '', source: { type: 'const', value: '' } })
                return { ...prev, columns: next }
              })
            }}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <Plus />
          </Button>
          <Button
            onClick={() => {
              updateExportConfig((prev) => ({ ...prev, columns: prev.columns.filter((c) => c.id !== colId) }))
            }}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <Trash2 />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function getDefaultHeader(col: ShoppingMallExportConfigV1['columns'][number], columnMap: Map<number, AvailableColumn>) {
  if (col.source.type === 'input') {
    return columnMap.get(col.source.columnIndex)?.header ?? ''
  }
  return ''
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

'use client'

import { Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { SABANGNET_COLUMNS_REQUIRED_FIRST } from './util/sabangnet-columns-required-first'
import { getNonEmptyFixedValueEntries, getSabangnetFieldLabel } from './util/sabangnet-field-utils'

interface FixedValuesEditorProps {
  mappedFieldKeys: Set<string>
  onRemove: (fieldKey: string) => void
  onUpsert: (fieldKey: string, value: string) => void
  value: Record<string, string>
}

export function FixedValuesEditor({ value, mappedFieldKeys, onUpsert, onRemove }: FixedValuesEditorProps) {
  const activeFixedEntries = useMemo(() => {
    return getNonEmptyFixedValueEntries(value)
  }, [value])

  const activeFixedFieldKeys = useMemo(() => new Set(activeFixedEntries.map((e) => e.fieldKey)), [activeFixedEntries])

  const [draftFieldKey, setDraftFieldKey] = useState('')
  const [draftValue, setDraftValue] = useState('')

  const availableDraftFields = useMemo(() => {
    return SABANGNET_COLUMNS_REQUIRED_FIRST.filter(
      (f) => !mappedFieldKeys.has(f.key) && !activeFixedFieldKeys.has(f.key),
    )
  }, [activeFixedFieldKeys, mappedFieldKeys])

  function handleAdd() {
    const fieldKey = draftFieldKey.trim()
    const nextValue = draftValue.trim()

    if (!fieldKey) {
      toast.error('사방넷 필드를 선택해 주세요')
      return
    }

    if (mappedFieldKeys.has(fieldKey)) {
      toast.error('이미 컬럼 연결에 사용 중인 필드예요')
      return
    }

    if (nextValue.length === 0) {
      toast.error('고정값을 입력해 주세요')
      return
    }

    onUpsert(fieldKey, nextValue)
    setDraftFieldKey('')
    setDraftValue('')
  }

  return (
    <section className="space-y-3 rounded-lg bg-muted/30 p-4 ring-1 ring-border/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">고정값</p>
          <p className="text-xs text-muted-foreground">컬럼 연결이 없거나 값이 비어 있으면, 여기 고정값으로 채워요.</p>
        </div>
      </div>

      <div className="rounded-md bg-background ring-1 ring-border/50">
        {activeFixedEntries.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">설정된 고정값이 없어요</div>
        ) : (
          <Table className="table-fixed">
            <colgroup>
              <col className="w-[220px]" />
              <col className="w-[320px]" />
              <col className="w-[80px]" />
            </colgroup>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium text-muted-foreground">사방넷 필드</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">값</TableHead>
                <TableHead className="text-center text-xs font-medium text-muted-foreground">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/50">
              {activeFixedEntries.map((entry) => {
                const label = getSabangnetFieldLabel(entry.fieldKey)
                return (
                  <TableRow className="hover:bg-transparent" key={entry.fieldKey}>
                    <TableCell>
                      <span className="text-sm font-medium text-foreground">{label}</span>
                    </TableCell>
                    <TableCell>
                      <Input
                        defaultValue={entry.value}
                        onBlur={(e) => onUpsert(entry.fieldKey, e.currentTarget.value)}
                        placeholder="값을 입력해요"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Button onClick={() => onRemove(entry.fieldKey)} size="icon-sm" type="button" variant="ghost">
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

      <div className="grid gap-3 rounded-md bg-background p-3 ring-1 ring-border/50 sm:grid-cols-[220px_1fr_auto]">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">사방넷 필드</Label>
          <Select onValueChange={setDraftFieldKey} value={draftFieldKey}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={availableDraftFields.length > 0 ? '필드를 선택해요' : '추가할 필드가 없어요'} />
            </SelectTrigger>
            <SelectContent>
              {availableDraftFields.map((field) => (
                <SelectItem key={field.key} value={field.key}>
                  {field.label}
                  {field.required && <span className="ml-1 text-destructive">*</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">값</Label>
          <Input onChange={(e) => setDraftValue(e.target.value)} placeholder="값을 입력해요" value={draftValue} />
        </div>

        <div className="flex items-end">
          <Button onClick={handleAdd} type="button" variant="outline">
            <Plus className="h-4 w-4" />
            추가
          </Button>
        </div>
      </div>
    </section>
  )
}

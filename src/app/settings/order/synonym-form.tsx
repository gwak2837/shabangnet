'use client'

import { BookOpen, ChevronRight, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'

import type { ColumnSynonym } from '@/services/column-synonyms'

import { SABANGNET_COLUMNS } from '@/common/constants'
import { queryKeys } from '@/common/constants/query-keys'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useServerAction } from '@/hooks/use-server-action'
import { useColumnSynonyms } from '@/hooks/use-settings'

import { addSynonym, removeSynonym, updateSynonym } from './action'

const STANDARD_KEY_OPTIONS = SABANGNET_COLUMNS.filter(
  (col) =>
    !['cjDate', 'collectedAt', 'logisticsMemo', 'modelNumber', 'reserved1', 'reserved2', 'subOrderNumber'].includes(
      col.key,
    ),
).map((col) => ({
  key: col.key,
  label: col.label,
}))

interface SynonymGroupProps {
  isUpdating: boolean
  onEdit: (syn: ColumnSynonym) => void
  onRemove: (id: number) => void
  onToggle: (id: number, enabled: boolean) => void
  option: { key: string; label: string }
  synonyms: ColumnSynonym[]
}

interface SynonymItemProps {
  isUpdating: boolean
  onEdit: (syn: ColumnSynonym) => void
  onRemove: (id: number) => void
  onToggle: (id: number, enabled: boolean) => void
  synonym: ColumnSynonym
}

export function SynonymForm() {
  const { data: synonyms = [], isLoading } = useColumnSynonyms()
  const [selectedKey, setSelectedKey] = useState('')
  const [editingSynonym, setEditingSynonym] = useState<ColumnSynonym | null>(null)

  const { execute: onAdd, isPending: isAdding } = useServerAction(
    (data: { standardKey: string; synonym: string }) => addSynonym(data),
    {
      invalidateKeys: [queryKeys.settings.synonyms],
      onSuccess: () => toast.success('동의어가 추가되었습니다'),
      onError: (error) => toast.error(error),
    },
  )

  const { execute: updateSynonymAction, isPending: isUpdating } = useServerAction(
    ({ id, data }: { id: number; data: Partial<{ enabled: boolean; standardKey: string; synonym: string }> }) =>
      updateSynonym(id, data),
    {
      invalidateKeys: [queryKeys.settings.synonyms],
      onSuccess: () => toast.success('동의어가 수정되었습니다'),
      onError: (error) => toast.error(error),
    },
  )

  const { execute: onRemove } = useServerAction((id: number) => removeSynonym(id), {
    invalidateKeys: [queryKeys.settings.synonyms],
    onSuccess: () => toast.success('동의어가 삭제되었습니다'),
    onError: (error) => toast.error(error),
  })

  function onUpdate(id: number, data: Partial<{ enabled: boolean; standardKey: string; synonym: string }>) {
    updateSynonymAction({ id, data })
  }

  function handleAddSynonym(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!selectedKey) {
      return
    }

    const data = new FormData(e.currentTarget)
    const synonym = String(data.get('synonym')).trim()
    onAdd({ standardKey: selectedKey, synonym })
    e.currentTarget.reset()
  }

  function handleEditSynonym(syn: ColumnSynonym) {
    setEditingSynonym({ ...syn })
  }

  function handleSaveSynonym(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!editingSynonym) {
      return
    }

    onUpdate(editingSynonym.id, {
      synonym: editingSynonym.synonym.trim(),
      standardKey: editingSynonym.standardKey,
      enabled: editingSynonym.enabled,
    })

    setEditingSynonym(null)
  }

  return (
    <>
      <section className="glass-card p-0 overflow-hidden">
        <header className="px-6 pt-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-amber-500/10 to-amber-600/5 ring-1 ring-amber-500/10">
              <BookOpen className="h-5 w-5 text-amber-500" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">컬럼 동의어 사전</h2>
              <p className="text-sm text-muted-foreground">쇼핑몰 파일의 컬럼명을 사방넷 표준 컬럼에 자동 매핑합니다</p>
            </div>
          </div>
        </header>
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">표준 컬럼별 동의어</Label>
              <Badge className="text-xs" variant="secondary">
                {synonyms.filter((s) => s.enabled).length}/{synonyms.length} 활성화
              </Badge>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-1.5">
                {STANDARD_KEY_OPTIONS.map((option) => (
                  <SynonymGroup
                    isUpdating={isUpdating}
                    key={option.key}
                    onEdit={handleEditSynonym}
                    onRemove={onRemove}
                    onToggle={(id, enabled) => onUpdate(id, { enabled })}
                    option={option}
                    synonyms={synonyms}
                  />
                ))}
              </div>
            )}
          </div>
          <form className="glass-panel rounded-lg p-4 space-y-3" onSubmit={handleAddSynonym}>
            <p className="text-sm font-medium">새 동의어 추가</p>
            <div className="flex gap-2">
              <Select name="standard-key" onValueChange={setSelectedKey} required value={selectedKey}>
                <SelectTrigger aria-label="표준 컬럼 선택" className="w-[200px]">
                  <SelectValue placeholder="표준 컬럼 선택" />
                </SelectTrigger>
                <SelectContent>
                  {STANDARD_KEY_OPTIONS.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                aria-label="동의어"
                className="flex-1"
                name="synonym"
                placeholder="동의어 입력 (예: 고객명, 수취인명)"
                required
              />
              <Button className="shrink-0" disabled={!selectedKey || isAdding} type="submit">
                {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                추가
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              쇼핑몰 엑셀 파일에서 해당 이름의 컬럼을 발견하면 자동으로 표준 컬럼에 매핑됩니다
            </p>
          </form>
          <div className="rounded-lg bg-amber-500/10 p-4 ring-1 ring-amber-500/20">
            <div className="flex items-start gap-3">
              <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div className="text-sm">
                <p className="font-medium text-amber-600">동의어 자동 매핑</p>
                <p className="mt-1 text-amber-500">
                  새 쇼핑몰 파일을 업로드할 때 컬럼명이 동의어 사전에 있으면 자동으로 매핑됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Dialog onOpenChange={(open) => !open && setEditingSynonym(null)} open={editingSynonym !== null}>
        <DialogContent className="sm:max-w-md max-h-[85dvh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle className="text-lg font-semibold tracking-tight">동의어 편집</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">동의어 정보를 수정합니다</DialogDescription>
          </DialogHeader>
          {editingSynonym && (
            <form className="contents" onSubmit={handleSaveSynonym}>
              <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium" htmlFor="edit-standard-key">
                    표준 컬럼
                  </Label>
                  <Select
                    onValueChange={(value) => setEditingSynonym({ ...editingSynonym, standardKey: value })}
                    value={editingSynonym.standardKey}
                  >
                    <SelectTrigger id="edit-standard-key">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STANDARD_KEY_OPTIONS.map((option) => (
                        <SelectItem key={option.key} value={option.key}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium" htmlFor="edit-synonym">
                    동의어
                  </Label>
                  <Input
                    id="edit-synonym"
                    onChange={(e) => setEditingSynonym({ ...editingSynonym, synonym: e.target.value })}
                    placeholder="동의어 입력"
                    required
                    value={editingSynonym.synonym}
                  />
                </div>
              </div>
              <DialogFooter className="px-6 py-4 bg-muted/50 border-t shrink-0">
                <div className="flex w-full gap-3">
                  <Button className="flex-1" onClick={() => setEditingSynonym(null)} type="button" variant="outline">
                    취소
                  </Button>
                  <Button className="flex-1" disabled={isUpdating} type="submit">
                    {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : '저장'}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function SynonymGroup({ option, synonyms, isUpdating, onToggle, onEdit, onRemove }: SynonymGroupProps) {
  const groupSynonyms = synonyms
    .filter((s) => s.standardKey === option.key)
    .sort((a, b) => a.synonym.localeCompare(b.synonym, 'ko'))

  const enabledCount = groupSynonyms.filter((s) => s.enabled).length
  const badgeState = groupSynonyms.length === 0 ? 'empty' : enabledCount === groupSynonyms.length ? 'all' : 'partial'

  return (
    <details className="glass-panel rounded-lg overflow-hidden group/details">
      <summary className="flex items-center gap-3 p-3 transition-colors hover:bg-accent/50 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open/details:rotate-90" />
        <span className="font-medium text-sm text-foreground">{option.label}</span>
        <span className="text-xs text-muted-foreground font-mono">({option.key})</span>
        <div className="flex-1" />
        <Badge
          className="text-xs data-[state=empty]:bg-muted data-[state=empty]:text-muted-foreground data-[state=all]:bg-emerald-500/10 data-[state=all]:text-emerald-600 data-[state=all]:ring-1 data-[state=all]:ring-emerald-500/20 data-[state=partial]:bg-amber-500/10 data-[state=partial]:text-amber-600 data-[state=partial]:ring-1 data-[state=partial]:ring-amber-500/20"
          data-state={badgeState}
          variant="secondary"
        >
          {enabledCount}/{groupSynonyms.length}
        </Badge>
      </summary>
      <div className="border-t border-border/50 bg-muted/20 p-3">
        {groupSynonyms.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">등록된 동의어가 없습니다</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {groupSynonyms.map((syn) => (
              <SynonymItem
                isUpdating={isUpdating}
                key={syn.id}
                onEdit={onEdit}
                onRemove={onRemove}
                onToggle={onToggle}
                synonym={syn}
              />
            ))}
          </div>
        )}
      </div>
    </details>
  )
}

function SynonymItem({ synonym, onToggle, onEdit, onRemove, isUpdating }: SynonymItemProps) {
  return (
    <div
      aria-checked={synonym.enabled}
      className="group/item inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition ring-1 ring-inset aria-checked:bg-background aria-checked:ring-border/50 aria-checked:text-foreground aria-[checked=false]:bg-muted/50 aria-[checked=false]:ring-border/30 aria-[checked=false]:text-muted-foreground"
    >
      <label className="inline-flex items-center gap-1.5 cursor-pointer">
        <Switch
          checked={synonym.enabled}
          className="scale-90"
          disabled={isUpdating}
          onCheckedChange={(checked) => onToggle(synonym.id, checked)}
        />
        <span className="group-aria-[checked=false]/item:line-through">{synonym.synonym}</span>
      </label>
      <button className="p-1 rounded transition-colors hover:bg-accent" onClick={() => onEdit(synonym)} type="button">
        <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
      </button>
      <button
        className="p-1 rounded transition-colors hover:bg-destructive/10"
        onClick={() => onRemove(synonym.id)}
        type="button"
      >
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  )
}

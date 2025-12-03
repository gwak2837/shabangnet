'use client'

import { BookOpen, ChevronDown, ChevronRight, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { ColumnSynonym } from '@/services/column-synonyms'

import { SABANGNET_COLUMNS } from '@/common/constants'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

// 사방넷 표준 컬럼 옵션 (동의어 대상)
const STANDARD_KEY_OPTIONS = SABANGNET_COLUMNS.filter(
  (col) =>
    !['cjDate', 'collectedAt', 'logisticsMemo', 'modelNumber', 'reserved1', 'reserved2', 'subOrderNumber'].includes(
      col.key,
    ),
).map((col) => ({
  key: col.key,
  label: col.label,
}))

interface SynonymFormProps {
  isAdding?: boolean
  isRemoving?: boolean
  isUpdating?: boolean
  onAdd: (data: { standardKey: string; synonym: string }) => void
  onRemove: (id: string) => void
  onUpdate: (id: string, data: Partial<{ enabled: boolean; standardKey: string; synonym: string }>) => void
  synonyms?: ColumnSynonym[]
}

export function SynonymForm({
  synonyms = [],
  onAdd,
  onRemove,
  onUpdate,
  isAdding = false,
  isUpdating = false,
}: SynonymFormProps) {
  const [newSynonym, setNewSynonym] = useState('')
  const [selectedKey, setSelectedKey] = useState<string>('')
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())

  // Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSynonym, setEditingSynonym] = useState<ColumnSynonym | null>(null)

  // 표준키별로 그룹화
  const groupedSynonyms = useMemo(() => {
    const groups: Record<string, ColumnSynonym[]> = {}

    for (const syn of synonyms) {
      if (!groups[syn.standardKey]) {
        groups[syn.standardKey] = []
      }
      groups[syn.standardKey].push(syn)
    }

    // 각 그룹 내에서 알파벳순 정렬
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => a.synonym.localeCompare(b.synonym, 'ko'))
    }

    return groups
  }, [synonyms])

  // 표준키별 활성화된 동의어 수
  const enabledCounts = useMemo(() => {
    const counts: Record<string, { enabled: number; total: number }> = {}

    for (const [key, syns] of Object.entries(groupedSynonyms)) {
      counts[key] = {
        enabled: syns.filter((s) => s.enabled).length,
        total: syns.length,
      }
    }

    return counts
  }, [groupedSynonyms])

  function toggleExpanded(key: string) {
    const newExpanded = new Set(expandedKeys)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedKeys(newExpanded)
  }

  function handleAddSynonym() {
    if (!newSynonym.trim() || !selectedKey) return

    onAdd({
      standardKey: selectedKey,
      synonym: newSynonym.trim(),
    })

    setNewSynonym('')
  }

  function handleEditSynonym(syn: ColumnSynonym) {
    setEditingSynonym({ ...syn })
    setIsModalOpen(true)
  }

  function handleSaveSynonym() {
    if (!editingSynonym || !editingSynonym.synonym.trim()) return

    onUpdate(editingSynonym.id, {
      synonym: editingSynonym.synonym.trim(),
      standardKey: editingSynonym.standardKey,
      enabled: editingSynonym.enabled,
    })

    setIsModalOpen(false)
    setEditingSynonym(null)
  }

  function handleToggleSynonym(id: string, enabled: boolean) {
    onUpdate(id, { enabled })
  }

  function getStandardKeyLabel(key: string): string {
    const option = STANDARD_KEY_OPTIONS.find((o) => o.key === key)
    return option ? option.label : key
  }

  return (
    <>
      <Card className="border-slate-200 bg-card shadow-sm py-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <BookOpen className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-lg">컬럼 동의어 사전</CardTitle>
              <CardDescription>
                쇼핑몰 파일의 컬럼명을 사방넷 표준 컬럼에 자동 매핑하기 위한 동의어를 관리합니다
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* Grouped Synonyms List */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>표준 컬럼별 동의어</Label>
              <Badge className="bg-slate-100 text-slate-600" variant="secondary">
                {synonyms.filter((s) => s.enabled).length}/{synonyms.length} 활성화
              </Badge>
            </div>

            <div className="flex flex-col gap-1">
              {STANDARD_KEY_OPTIONS.map((option) => {
                const syns = groupedSynonyms[option.key] || []
                const counts = enabledCounts[option.key] || { enabled: 0, total: 0 }
                const isExpanded = expandedKeys.has(option.key)

                return (
                  <div className="rounded-lg border border-slate-200" key={option.key}>
                    {/* Header */}
                    <button
                      className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors"
                      onClick={() => toggleExpanded(option.key)}
                      type="button"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                      <span className="font-medium text-sm">{option.label}</span>
                      <span className="text-xs text-slate-400 font-mono">({option.key})</span>
                      <div className="flex-1" />
                      <Badge
                        className={`text-xs ${
                          counts.total === 0
                            ? 'bg-slate-100 text-slate-400'
                            : counts.enabled === counts.total
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}
                        variant="secondary"
                      >
                        {counts.enabled}/{counts.total}
                      </Badge>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t border-slate-200 bg-slate-50/50 p-3">
                        {syns.length === 0 ? (
                          <p className="text-sm text-slate-400 text-center py-2">등록된 동의어가 없습니다</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {syns.map((syn) => (
                              <div
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
                                  syn.enabled
                                    ? 'border-slate-200 bg-card text-slate-700'
                                    : 'border-slate-100 bg-slate-100 text-slate-400'
                                }`}
                                key={syn.id}
                              >
                                <Switch
                                  checked={syn.enabled}
                                  className="scale-75"
                                  disabled={isUpdating}
                                  onCheckedChange={(checked) => handleToggleSynonym(syn.id, checked)}
                                />
                                <span className={syn.enabled ? '' : 'line-through'}>{syn.synonym}</span>
                                <button
                                  className="p-0.5 hover:bg-slate-100 rounded transition-colors"
                                  onClick={() => handleEditSynonym(syn)}
                                  type="button"
                                >
                                  <Pencil className="h-3 w-3 text-slate-400 hover:text-slate-600" />
                                </button>
                                <button
                                  className="p-0.5 hover:bg-rose-50 rounded transition-colors"
                                  onClick={() => onRemove(syn.id)}
                                  type="button"
                                >
                                  <Trash2 className="h-3 w-3 text-slate-400 hover:text-rose-600" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Add New Synonym */}
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <Label>새 동의어 추가</Label>
            <div className="flex gap-2">
              <Select onValueChange={setSelectedKey} value={selectedKey}>
                <SelectTrigger className="w-[200px] bg-card">
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
                className="flex-1 bg-card"
                onChange={(e) => setNewSynonym(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSynonym.trim() && selectedKey) {
                    handleAddSynonym()
                  }
                }}
                placeholder="동의어 입력 (예: 고객명, 수취인명)"
                value={newSynonym}
              />
              <Button
                className="shrink-0 bg-amber-600 hover:bg-amber-700"
                disabled={!newSynonym.trim() || !selectedKey || isAdding}
                onClick={handleAddSynonym}
              >
                {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                추가
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              쇼핑몰 엑셀 파일에서 해당 이름의 컬럼을 발견하면 자동으로 표준 컬럼에 매핑됩니다
            </p>
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">동의어 자동 매핑</p>
              <p className="mt-1">
                새 쇼핑몰 파일을 업로드할 때 컬럼명이 동의어 사전에 있으면 자동으로 매핑됩니다. 새로운 쇼핑몰을 추가할
                때마다 그 쇼핑몰에서 사용하는 컬럼명을 동의어로 등록해두면 편리합니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Synonym Modal */}
      <Dialog onOpenChange={setIsModalOpen} open={isModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>동의어 수정</DialogTitle>
            <DialogDescription>동의어 정보를 수정합니다</DialogDescription>
          </DialogHeader>

          {editingSynonym && (
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="editStandardKey">표준 컬럼</Label>
                <Select
                  onValueChange={(value) => setEditingSynonym({ ...editingSynonym, standardKey: value })}
                  value={editingSynonym.standardKey}
                >
                  <SelectTrigger>
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

              <div className="flex flex-col gap-2">
                <Label htmlFor="editSynonym">동의어</Label>
                <Input
                  id="editSynonym"
                  onChange={(e) => setEditingSynonym({ ...editingSynonym, synonym: e.target.value })}
                  placeholder="동의어 입력"
                  value={editingSynonym.synonym}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={editingSynonym.enabled}
                  id="editEnabled"
                  onCheckedChange={(checked) => setEditingSynonym({ ...editingSynonym, enabled: checked })}
                />
                <Label htmlFor="editEnabled">활성화</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsModalOpen(false)} variant="outline">
              취소
            </Button>
            <Button
              className="bg-slate-900 hover:bg-slate-800"
              disabled={!editingSynonym?.synonym.trim() || isUpdating}
              onClick={handleSaveSynonym}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                '저장'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

'use client'

import { Filter, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'

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
import { Switch } from '@/components/ui/switch'
import { useServerAction } from '@/hooks/use-server-action'
import { useExclusionSettings } from '@/hooks/use-settings'
import {
  addExclusionPattern,
  type ExclusionPattern,
  type ExclusionSettings,
  removeExclusionPattern,
  updateExclusionPattern,
  updateExclusionSettings,
} from '@/services/settings'

const defaultSettings: ExclusionSettings = {
  enabled: true,
  patterns: [],
}

const SKELETON_PATTERN: ExclusionPattern = {
  id: 'skeleton',
  pattern: '[00000000]주문_샘플패턴',
  description: '패턴 설명',
  enabled: true,
}

export function ExclusionForm() {
  const { execute: onUpdateSettings, isPending: isUpdatingSettings } = useServerAction(
    (data: Partial<ExclusionSettings>) => updateExclusionSettings(data),
    {
      invalidateKeys: [queryKeys.settings.exclusion],
      onSuccess: () => toast.success('설정이 저장되었습니다'),
      onError: (error) => toast.error(error),
    },
  )

  const { execute: onAddPattern, isPending: isAddingPattern } = useServerAction(
    (pattern: Omit<ExclusionPattern, 'id'>) => addExclusionPattern(pattern),
    {
      invalidateKeys: [queryKeys.settings.exclusion],
      onSuccess: () => toast.success('패턴이 추가되었습니다'),
      onError: (error) => toast.error(error),
    },
  )

  const { execute: onRemovePattern } = useServerAction((id: string) => removeExclusionPattern(id), {
    invalidateKeys: [queryKeys.settings.exclusion],
    onSuccess: () => toast.success('패턴이 삭제되었습니다'),
    onError: (error) => toast.error(error),
  })

  const { execute: updatePattern, isPending: isUpdatingPattern } = useServerAction(
    ({ id, data }: { id: string; data: Partial<Omit<ExclusionPattern, 'id'>> }) => updateExclusionPattern(id, data),
    {
      invalidateKeys: [queryKeys.settings.exclusion],
      onSuccess: () => toast.success('패턴이 수정되었습니다'),
      onError: (error) => toast.error(error),
    },
  )

  const { data: settings = defaultSettings, isLoading } = useExclusionSettings()
  const [editingPattern, setEditingPattern] = useState<ExclusionPattern | null>(null)
  const enabledCount = settings.patterns.filter((p) => p.enabled).length
  const isSaving = isUpdatingSettings || isAddingPattern
  const isUpdating = isUpdatingPattern

  function handleAddPattern(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const data = new FormData(e.currentTarget)
    const pattern = String(data.get('pattern')).trim()
    const description = String(data.get('description')).trim()

    onAddPattern({
      pattern,
      enabled: true,
      description: description || undefined,
    })

    e.currentTarget.reset()
  }

  function handleSavePattern(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!editingPattern) {
      return
    }

    updatePattern({
      id: editingPattern.id,
      data: {
        pattern: editingPattern.pattern.trim(),
        description: editingPattern.description?.trim() || undefined,
        enabled: editingPattern.enabled,
      },
    })

    setEditingPattern(null)
  }

  function onUpdatePattern(id: string, data: Partial<Omit<ExclusionPattern, 'id'>>) {
    updatePattern({ id, data })
  }

  return (
    <>
      <section className="glass-card p-0 overflow-hidden">
        <header className="px-6 pt-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-violet-500/10 to-violet-600/5 ring-1 ring-violet-500/10">
              <Filter className="h-5 w-5 text-violet-500" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">발송 제외 설정</h2>
              <p className="text-sm text-muted-foreground">특정 주문 유형을 이메일 발송에서 자동으로 제외합니다</p>
            </div>
          </div>
        </header>
        <div className="p-6 space-y-5">
          <label className="glass-panel rounded-lg p-4 flex items-center justify-between cursor-pointer">
            <div className="flex flex-col gap-0.5">
              <span className="text-base font-medium">자동 필터링 사용</span>
              <p className="text-sm text-muted-foreground">
                주문 유형(F열)이 아래 패턴과 일치하면 발송 대상에서 자동 제외됩니다
              </p>
            </div>
            <Switch checked={settings.enabled} onCheckedChange={(checked) => onUpdateSettings({ enabled: checked })} />
          </label>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">제외 패턴</Label>
              <Badge className="text-xs" variant="secondary">
                {enabledCount}/{settings.patterns.length} 활성화
              </Badge>
            </div>
            <div className="space-y-2">
              {isLoading ? (
                <PatternItem pattern={SKELETON_PATTERN} skeleton />
              ) : settings.patterns.length === 0 ? (
                <div className="glass-panel rounded-lg p-8 text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-muted/50">
                    <Filter className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-base font-medium text-foreground">아직 제외 패턴이 없습니다</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    첫 번째 패턴을 추가하면 해당 주문이 자동으로 제외됩니다
                  </p>
                </div>
              ) : (
                settings.patterns.map((pattern) => (
                  <PatternItem
                    disabled={!settings.enabled || isUpdating}
                    key={pattern.id}
                    onEdit={() => setEditingPattern({ ...pattern })}
                    onRemove={() => onRemovePattern(pattern.id)}
                    onToggle={(checked) => onUpdatePattern(pattern.id, { enabled: checked })}
                    pattern={pattern}
                  />
                ))
              )}
            </div>
          </div>
          <form className="glass-panel rounded-lg p-4 space-y-3" onSubmit={handleAddPattern}>
            <p className="text-sm font-medium">새 패턴 추가</p>
            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Input
                  aria-label="패턴"
                  className="font-mono"
                  name="pattern"
                  placeholder="예: [30002002]주문_센터택배"
                  required
                />
                <Input aria-label="설명" name="description" placeholder="설명 (선택사항)" />
              </div>
              <Button className="shrink-0 self-start" disabled={isSaving} type="submit">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                추가
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              주문 유형에 패턴이 포함되면 자동으로 발송 제외 대상으로 분류됩니다
            </p>
          </form>
          <div className="rounded-lg bg-violet-500/10 p-4 ring-1 ring-violet-500/20">
            <div className="flex items-start gap-3">
              <Filter className="mt-0.5 h-5 w-5 shrink-0 text-violet-500" />
              <div className="text-sm">
                <p className="font-medium text-violet-600">제외된 주문 확인하기</p>
                <p className="mt-1 text-violet-500">
                  자동 제외된 주문은 주문 페이지 &quot;발송제외&quot; 탭에서 검토하고 필요시 복원할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Dialog onOpenChange={(open) => !open && setEditingPattern(null)} open={editingPattern !== null}>
        <DialogContent className="sm:max-w-md max-h-[85dvh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle className="text-lg font-semibold tracking-tight">패턴 편집</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              발송 제외 패턴 정보를 수정합니다
            </DialogDescription>
          </DialogHeader>
          {editingPattern && (
            <form className="contents" onSubmit={handleSavePattern}>
              <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium" htmlFor="edit-pattern">
                    패턴
                  </Label>
                  <Input
                    className="font-mono"
                    id="edit-pattern"
                    onChange={(e) => setEditingPattern({ ...editingPattern, pattern: e.target.value })}
                    placeholder="예: [30002002]주문_센터택배"
                    required
                    value={editingPattern.pattern}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium" htmlFor="edit-description">
                    설명 (선택)
                  </Label>
                  <Input
                    id="edit-description"
                    onChange={(e) => setEditingPattern({ ...editingPattern, description: e.target.value })}
                    placeholder="패턴에 대한 설명"
                    value={editingPattern.description || ''}
                  />
                </div>
              </div>
              <DialogFooter className="px-6 py-4 bg-muted/50 border-t shrink-0">
                <div className="flex w-full gap-3">
                  <Button className="flex-1" onClick={() => setEditingPattern(null)} type="button" variant="outline">
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

function PatternItem({
  pattern,
  skeleton,
  disabled,
  onEdit,
  onRemove,
  onToggle,
}: {
  pattern: ExclusionPattern
  skeleton?: boolean
  disabled?: boolean
  onEdit?: () => void
  onRemove?: () => void
  onToggle?: (enabled: boolean) => void
}) {
  return (
    <div
      aria-busy={skeleton}
      aria-disabled={!skeleton && !pattern.enabled}
      className="glass-panel rounded-lg p-3 flex items-center gap-3 transition aria-disabled:opacity-50 aria-busy:animate-pulse aria-busy:cursor-not-allowed"
    >
      <label className="flex flex-1 items-center gap-3 min-w-0 cursor-pointer">
        <Switch checked={pattern.enabled} disabled={disabled} onCheckedChange={onToggle} />
        <div className="flex-1 min-w-0">
          <p className="font-mono text-sm truncate text-foreground">{pattern.pattern}</p>
          {pattern.description && <p className="text-xs text-muted-foreground truncate">{pattern.description}</p>}
        </div>
      </label>
      <button
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        onClick={onEdit}
        type="button"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        onClick={onRemove}
        type="button"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

'use client'

import { Loader2, Pencil, Plus, Trash2, Truck, X } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'

import { queryKeys } from '@/common/constants/query-keys'
import { SettingsIconBadge } from '@/components/settings/settings-icon-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useServerAction } from '@/hooks/use-server-action'

import { addCourierMapping, CourierMapping, removeCourierMapping, updateCourierMapping } from './action'
import { useCourierMappings } from './hook'

const SKELETON_COURIER: CourierMapping = {
  id: 0,
  name: '택배사 이름',
  code: '00',
  aliases: ['별칭 1', '별칭 2'],
  enabled: true,
}

export function CourierForm() {
  const { data: mappings = [], isLoading } = useCourierMappings()

  const [isUpdatingCourier, updateCourier] = useServerAction(updateCourierMapping, {
    invalidateKeys: [queryKeys.settings.courier],
    onSuccess: () => toast.success('택배사 연결이 수정됐어요'),
  })

  const [isAddingCourier, addCourier] = useServerAction(addCourierMapping, {
    invalidateKeys: [queryKeys.settings.courier],
    onSuccess: () => toast.success('택배사 연결이 추가됐어요'),
  })

  const [, removeCourier] = useServerAction(removeCourierMapping, {
    invalidateKeys: [queryKeys.settings.courier],
    onSuccess: () => toast.success('택배사 연결이 삭제됐어요'),
  })

  const [editingCourier, setEditingCourier] = useState<CourierMapping | null>(null)
  const [aliases, setAliases] = useState<string[]>([])
  const isModalOpen = editingCourier !== null
  const isNewCourier = editingCourier?.id === 0
  const isSaving = isUpdatingCourier || isAddingCourier

  function handleAddCourier() {
    setAliases([])
    setEditingCourier({ id: 0, name: '', code: '', aliases: [], enabled: true })
  }

  function handleEditCourier(courier: CourierMapping) {
    setAliases(courier.aliases)
    setEditingCourier(courier)
  }

  function handleAddAlias(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const alias = String(formData.get('alias')).trim()

    if (!aliases.includes(alias)) {
      setAliases([...aliases, alias])
    }

    e.currentTarget.reset()
  }

  function handleRemoveAlias(alias: string) {
    setAliases(aliases.filter((a) => a !== alias))
  }

  function handleSaveCourier(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!editingCourier) {
      return
    }

    const formData = new FormData(e.currentTarget)
    const name = String(formData.get('name')).trim()
    const code = String(formData.get('code')).trim()

    if (isNewCourier) {
      addCourier({ name, code, aliases, enabled: true })
    } else {
      updateCourier({ id: editingCourier.id, name, code, aliases, enabled: editingCourier.enabled })
    }

    setEditingCourier(null)
  }

  return (
    <>
      <section className="rounded-xl border border-slate-200 bg-card p-0 shadow-sm overflow-hidden">
        <header className="px-6 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SettingsIconBadge accent="blue" className="h-10 w-10" icon={Truck} />
              <div className="space-y-0.5">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">택배사</h2>
                <p className="text-sm text-muted-foreground">송장의 택배사명을 자동으로 인식합니다</p>
              </div>
            </div>
            <Button className="gap-2" onClick={handleAddCourier} size="sm" type="button" variant="outline">
              <Plus className="h-4 w-4" />
              추가
            </Button>
          </div>
        </header>
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            {isLoading ? (
              <CourierItem courier={SKELETON_COURIER} skeleton />
            ) : mappings.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-muted/50">
                  <Truck className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-base font-medium text-foreground">택배사 없음</p>
                <p className="mt-1 text-sm text-muted-foreground">추가 버튼을 눌러 시작하세요</p>
              </div>
            ) : (
              mappings.map((courier) => (
                <CourierItem
                  courier={courier}
                  key={courier.id}
                  onEdit={() => handleEditCourier(courier)}
                  onRemove={() => removeCourier(courier.id)}
                  onToggle={() => updateCourier({ id: courier.id, enabled: !courier.enabled })}
                />
              ))
            )}
          </div>
          <div className="rounded-lg bg-muted/30 p-4 ring-1 ring-border/30">
            <p className="text-sm leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">별칭</span>을 추가하면 다양한 택배사 표기를 자동으로
              인식합니다.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              CJ대한통운, CJ택배, 대한통운 →{' '}
              <code className="rounded bg-secondary/80 px-1.5 py-0.5 font-mono text-xs text-secondary-foreground">
                04
              </code>
            </p>
          </div>
        </div>
      </section>
      <Dialog onOpenChange={(open) => !open && setEditingCourier(null)} open={isModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[85dvh] flex flex-col gap-0 p-0 overflow-hidden">
          <form id="alias-form" onSubmit={handleAddAlias} />
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle className="text-lg font-semibold tracking-tight">
              {isNewCourier ? '새 택배사' : '택배사 편집'}
            </DialogTitle>
          </DialogHeader>
          {editingCourier && (
            <form className="contents" onSubmit={handleSaveCourier}>
              <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium" htmlFor="courier-name">
                      이름
                    </Label>
                    <Input
                      defaultValue={editingCourier.name}
                      id="courier-name"
                      name="name"
                      placeholder="CJ대한통운"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium" htmlFor="courier-code">
                      사방넷 코드
                    </Label>
                    <Input
                      className="font-mono"
                      defaultValue={editingCourier.code}
                      id="courier-code"
                      name="code"
                      placeholder="04"
                      required
                    />
                  </div>
                </div>
                <fieldset className="space-y-1.5">
                  <Label asChild className="text-sm font-medium">
                    <legend>별칭</legend>
                  </Label>
                  <div className="flex gap-2">
                    <Input form="alias-form" name="alias" placeholder="거래처에서 사용하는 표기" required />
                    <Button className="shrink-0" form="alias-form" size="sm" type="submit" variant="outline">
                      추가
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 min-h-[28px] pt-1">
                    {aliases.map((alias) => (
                      <Badge className="gap-1 h-6 pl-2 pr-1 text-xs font-medium" key={alias} variant="secondary">
                        {alias}
                        <button
                          className="flex h-4 w-4 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted-foreground/20 hover:text-foreground"
                          onClick={() => handleRemoveAlias(alias)}
                          type="button"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </fieldset>
              </div>
              <DialogFooter className="px-6 py-4 bg-muted/30 border-t shrink-0">
                <div className="flex w-full gap-3">
                  <Button className="flex-1" onClick={() => setEditingCourier(null)} type="button" variant="outline">
                    취소
                  </Button>
                  <Button className="flex-1" disabled={isSaving} type="submit">
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    저장
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

function CourierItem({
  courier,
  skeleton,
  onToggle,
  onEdit,
  onRemove,
}: {
  courier: CourierMapping
  skeleton?: boolean
  onEdit?: () => void
  onRemove?: () => void
  onToggle?: () => void
}) {
  return (
    <div
      aria-busy={skeleton}
      className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 py-3 transition data-disabled:opacity-50 aria-busy:animate-pulse aria-busy:cursor-not-allowed"
      data-disabled={!skeleton && !courier.enabled ? '' : undefined}
    >
      <Switch checked={courier.enabled} id={`courier-${courier.id}`} onCheckedChange={onToggle} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1.5">
          <span className="font-medium text-base text-foreground truncate">{courier.name}</span>
          <span className="inline-flex items-center rounded-md bg-secondary/80 px-2 py-0.5 text-xs font-mono font-medium text-secondary-foreground ring-1 ring-inset ring-secondary-foreground/10">
            {courier.code}
          </span>
        </div>
        {courier.aliases.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {courier.aliases.slice(0, 4).map((alias, i) => (
              <span
                className="inline-flex items-center rounded bg-muted/50 px-1.5 py-0.5 text-xs text-muted-foreground ring-1 ring-inset ring-border/50"
                key={skeleton ? i : alias}
              >
                {alias}
              </span>
            ))}
            {courier.aliases.length > 4 && (
              <span className="text-xs text-muted-foreground">+{courier.aliases.length - 4}개</span>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-0.5">
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
    </div>
  )
}

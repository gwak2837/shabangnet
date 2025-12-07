'use client'

import { Loader2, Pencil, Plus, Trash2, Truck, X } from 'lucide-react'
import { type FormEvent, useState } from 'react'

import type { CourierMapping } from '@/services/settings'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface CourierFormProps {
  isSaving?: boolean
  mappings: CourierMapping[]
  onAdd: (data: Omit<CourierMapping, 'id'>) => void
  onRemove: (id: string) => void
  onUpdate: (id: string, data: Partial<CourierMapping>) => void
}

export function CourierForm({ mappings, onUpdate, onAdd, onRemove, isSaving = false }: CourierFormProps) {
  const [editingCourier, setEditingCourier] = useState<CourierMapping | null>(null)

  const isModalOpen = editingCourier !== null
  const isNewCourier = editingCourier?.id === ''

  function handleAddCourier() {
    setEditingCourier({
      id: '',
      name: '',
      code: '',
      aliases: [],
      enabled: true,
    })
  }

  function handleEditCourier(courier: CourierMapping) {
    setEditingCourier({ ...courier, aliases: [...courier.aliases] })
  }

  function handleAddAlias(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!editingCourier) {
      return
    }

    const formData = new FormData(e.currentTarget)
    const alias = String(formData.get('alias')).trim()

    if (editingCourier.aliases.includes(alias)) {
      e.currentTarget.reset()
      return
    }

    setEditingCourier({ ...editingCourier, aliases: [...editingCourier.aliases, alias] })
    e.currentTarget.reset()
  }

  function handleRemoveAlias(alias: string) {
    if (!editingCourier) {
      return
    }

    setEditingCourier({ ...editingCourier, aliases: editingCourier.aliases.filter((a) => a !== alias) })
  }

  function handleSaveCourier(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!editingCourier) {
      return
    }

    if (isNewCourier) {
      onAdd({
        name: editingCourier.name,
        code: editingCourier.code,
        aliases: editingCourier.aliases,
        enabled: editingCourier.enabled,
      })
    } else {
      onUpdate(editingCourier.id, editingCourier)
    }

    setEditingCourier(null)
  }

  return (
    <>
      {/* Apple HIG: Glass Card with depth and hierarchy */}
      <section className="glass-card p-0 overflow-hidden">
        <header className="px-6 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-blue-500/10 to-blue-600/5 ring-1 ring-blue-500/10">
                <Truck className="h-5 w-5 text-blue-500" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">택배사</h2>
                <p className="text-sm text-muted-foreground">송장의 택배사명을 자동으로 인식합니다</p>
              </div>
            </div>
            <button
              className="glass-button inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium text-foreground"
              onClick={handleAddCourier}
            >
              <Plus className="h-4 w-4" />
              추가
            </button>
          </div>
        </header>
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            {mappings.map((courier) => (
              <div
                aria-disabled={!courier.enabled}
                className="glass-panel rounded-lg p-4 py-3 transition aria-disabled:opacity-50"
                key={courier.id}
              >
                <div className="flex items-center gap-4">
                  <Switch
                    checked={courier.enabled}
                    id={`courier-${courier.id}`}
                    onCheckedChange={() => onUpdate(courier.id, { enabled: !courier.enabled })}
                  />
                  <label className="flex-1 min-w-0 cursor-pointer" htmlFor={`courier-${courier.id}`}>
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="font-medium text-base text-foreground truncate">{courier.name}</span>
                      <span className="inline-flex items-center rounded-md bg-secondary/80 px-2 py-0.5 text-xs font-mono font-medium text-secondary-foreground ring-1 ring-inset ring-secondary-foreground/10">
                        {courier.code}
                      </span>
                    </div>
                    {courier.aliases.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {courier.aliases.slice(0, 4).map((alias) => (
                          <span
                            className="inline-flex items-center rounded bg-muted/50 px-1.5 py-0.5 text-xs text-muted-foreground ring-1 ring-inset ring-border/50"
                            key={alias}
                          >
                            {alias}
                          </span>
                        ))}
                        {courier.aliases.length > 4 && (
                          <span className="text-xs text-muted-foreground">+{courier.aliases.length - 4}개</span>
                        )}
                      </div>
                    )}
                  </label>
                  <div className="flex items-center gap-0.5">
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      onClick={() => handleEditCourier(courier)}
                      type="button"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => onRemove(courier.id)}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {mappings.length === 0 && (
              <div className="glass-panel rounded-lg p-8 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-muted/50">
                  <Truck className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-base font-medium text-foreground">택배사 없음</p>
                <p className="mt-1 text-sm text-muted-foreground">추가 버튼을 눌러 시작하세요</p>
              </div>
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
                      id="courier-name"
                      onChange={(e) => setEditingCourier({ ...editingCourier, name: e.target.value })}
                      placeholder="CJ대한통운"
                      required
                      value={editingCourier.name}
                      variant="glass"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium" htmlFor="courier-code">
                      사방넷 코드
                    </Label>
                    <Input
                      className="font-mono"
                      id="courier-code"
                      onChange={(e) => setEditingCourier({ ...editingCourier, code: e.target.value })}
                      placeholder="04"
                      required
                      value={editingCourier.code}
                      variant="glass"
                    />
                  </div>
                </div>
                <fieldset className="space-y-1.5">
                  <Label asChild className="text-sm font-medium">
                    <legend>별칭</legend>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      form="alias-form"
                      name="alias"
                      placeholder="거래처에서 사용하는 표기"
                      required
                      variant="glass"
                    />
                    <Button className="shrink-0" form="alias-form" size="sm" type="submit" variant="outline">
                      추가
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 min-h-[28px] pt-1">
                    {editingCourier.aliases.map((alias) => (
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
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : '저장'}
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

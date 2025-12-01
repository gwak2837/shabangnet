'use client'

import { CheckCircle2, Loader2, Pencil, Plus, Trash2, Truck, X } from 'lucide-react'
import { useState } from 'react'

import type { CourierMapping } from '@/services/db/settings'

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
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface CourierFormProps {
  isSaving?: boolean
  mappings: CourierMapping[]
  onAdd: (data: Omit<CourierMapping, 'id'>) => void
  onRemove: (id: string) => void
  onUpdate: (id: string, data: Partial<CourierMapping>) => void
}

export function CourierForm({ mappings, onUpdate, onAdd, onRemove, isSaving = false }: CourierFormProps) {
  const [saved, setSaved] = useState(false)
  const [editingCourier, setEditingCourier] = useState<CourierMapping | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newAlias, setNewAlias] = useState('')
  const [isNewCourier, setIsNewCourier] = useState(false)

  // 새 택배사 추가용 빈 객체
  const createEmptyCourier = (): CourierMapping => ({
    id: `c${Date.now()}`,
    name: '',
    code: '',
    aliases: [],
    enabled: true,
  })

  const handleAddCourier = () => {
    setEditingCourier(createEmptyCourier())
    setIsNewCourier(true)
    setIsModalOpen(true)
  }

  const handleEditCourier = (courier: CourierMapping) => {
    setEditingCourier({ ...courier, aliases: [...courier.aliases] })
    setIsNewCourier(false)
    setIsModalOpen(true)
  }

  const handleDeleteCourier = (id: string) => {
    onRemove(id)
  }

  const handleToggleEnabled = (id: string, currentEnabled: boolean) => {
    onUpdate(id, { enabled: !currentEnabled })
  }

  const handleAddAlias = () => {
    if (!editingCourier || !newAlias.trim()) return
    if (editingCourier.aliases.includes(newAlias.trim())) {
      setNewAlias('')
      return
    }
    setEditingCourier({
      ...editingCourier,
      aliases: [...editingCourier.aliases, newAlias.trim()],
    })
    setNewAlias('')
  }

  const handleRemoveAlias = (alias: string) => {
    if (!editingCourier) return
    setEditingCourier({
      ...editingCourier,
      aliases: editingCourier.aliases.filter((a) => a !== alias),
    })
  }

  const handleSaveCourier = () => {
    if (!editingCourier || !editingCourier.name || !editingCourier.code) return

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

    setIsModalOpen(false)
    setEditingCourier(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <>
      <Card className="border-slate-200 bg-card shadow-sm py-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                <Truck className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-lg">택배사 코드 매핑</CardTitle>
                <CardDescription>거래처 송장의 택배사명을 사방넷 코드로 변환합니다</CardDescription>
              </div>
            </div>
            <Button className="gap-2" onClick={handleAddCourier} size="sm" variant="outline">
              <Plus className="h-4 w-4" />
              택배사 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Courier List Table */}
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12">활성</TableHead>
                  <TableHead>택배사명</TableHead>
                  <TableHead className="w-20">코드</TableHead>
                  <TableHead>별칭 (거래처 표기)</TableHead>
                  <TableHead className="w-24 text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((courier) => (
                  <TableRow className={!courier.enabled ? 'opacity-50' : ''} key={courier.id}>
                    <TableCell>
                      <Switch
                        checked={courier.enabled}
                        className="data-[state=checked]:bg-emerald-500"
                        onCheckedChange={() => handleToggleEnabled(courier.id, courier.enabled)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{courier.name}</TableCell>
                    <TableCell>
                      <Badge className="font-mono" variant="secondary">
                        {courier.code}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {courier.aliases.slice(0, 3).map((alias) => (
                          <Badge className="text-xs" key={alias} variant="outline">
                            {alias}
                          </Badge>
                        ))}
                        {courier.aliases.length > 3 && (
                          <Badge className="text-xs text-slate-500" variant="outline">
                            +{courier.aliases.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          className="h-8 w-8 p-0"
                          onClick={() => handleEditCourier(courier)}
                          size="sm"
                          variant="ghost"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => handleDeleteCourier(courier.id)}
                          size="sm"
                          variant="ghost"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Info */}
          <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
            <p>
              <strong>별칭</strong>은 거래처 송장 파일에서 사용하는 다양한 택배사 표기를 인식합니다.
            </p>
            <p className="mt-1">
              예: &quot;CJ대한통운&quot;, &quot;CJ택배&quot;, &quot;대한통운&quot; → 모두 코드 &quot;04&quot;로 변환
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            {saved && (
              <span className="flex items-center gap-1 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                저장되었습니다
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog onOpenChange={setIsModalOpen} open={isModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isNewCourier ? '택배사 추가' : '택배사 수정'}</DialogTitle>
            <DialogDescription>택배사 정보와 별칭을 입력하세요</DialogDescription>
          </DialogHeader>

          {editingCourier && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="courierName">택배사명 (사방넷 기준)</Label>
                  <Input
                    id="courierName"
                    onChange={(e) => setEditingCourier({ ...editingCourier, name: e.target.value })}
                    placeholder="CJ대한통운"
                    value={editingCourier.name}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="courierCode">사방넷 코드</Label>
                  <Input
                    className="font-mono"
                    id="courierCode"
                    onChange={(e) => setEditingCourier({ ...editingCourier, code: e.target.value })}
                    placeholder="04"
                    value={editingCourier.code}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>별칭 (거래처에서 사용하는 표기)</Label>
                <div className="flex gap-2">
                  <Input
                    onChange={(e) => setNewAlias(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddAlias()
                      }
                    }}
                    placeholder="별칭 입력"
                    value={newAlias}
                  />
                  <Button onClick={handleAddAlias} type="button" variant="outline">
                    추가
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 min-h-[32px]">
                  {editingCourier.aliases.map((alias) => (
                    <Badge className="gap-1 pr-1" key={alias} variant="secondary">
                      {alias}
                      <button
                        className="ml-1 rounded-full p-0.5 hover:bg-slate-300"
                        onClick={() => handleRemoveAlias(alias)}
                        type="button"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={editingCourier.enabled}
                  id="courierEnabled"
                  onCheckedChange={(checked) => setEditingCourier({ ...editingCourier, enabled: checked })}
                />
                <Label htmlFor="courierEnabled">활성화</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsModalOpen(false)} variant="outline">
              취소
            </Button>
            <Button
              className="bg-slate-900 hover:bg-slate-800"
              disabled={!editingCourier?.name || !editingCourier?.code || isSaving}
              onClick={handleSaveCourier}
            >
              {isSaving ? (
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

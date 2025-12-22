'use client'

import { Link2, Loader2 } from 'lucide-react'
import { useState } from 'react'

import type { Manufacturer } from '@/services/manufacturers.types'
import type { OptionManufacturerMapping } from '@/services/option-mappings'

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

interface OptionMappingModalProps {
  isSaving?: boolean
  manufacturers: Manufacturer[]
  mapping: OptionManufacturerMapping | null
  onOpenChange: (open: boolean) => void
  onSave: (data: Omit<OptionManufacturerMapping, 'createdAt' | 'id' | 'updatedAt'>) => void
  open: boolean
}

export function OptionMappingModal({
  open,
  onOpenChange,
  mapping,
  manufacturers,
  onSave,
  isSaving = false,
}: OptionMappingModalProps) {
  const [formData, setFormData] = useState(() => getFormDataFromMapping(mapping))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [prevMappingId, setPrevMappingId] = useState(mapping?.id)
  const [prevOpen, setPrevOpen] = useState(open)
  const isEdit = !!mapping

  if (mapping?.id !== prevMappingId || (open && !prevOpen)) {
    setPrevMappingId(mapping?.id)
    setPrevOpen(open)
    setFormData(getFormDataFromMapping(mapping))
    setErrors({})
  } else if (open !== prevOpen) {
    setPrevOpen(open)
  }

  function validate() {
    const newErrors: Record<string, string> = {}

    if (!formData.productCode.trim()) {
      newErrors.productCode = '상품코드를 입력해 주세요'
    }
    if (!formData.optionName.trim()) {
      newErrors.optionName = '옵션명을 입력해 주세요'
    }
    if (!formData.manufacturerId) {
      newErrors.manufacturerId = '제조사를 선택해 주세요'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validate()) return
    if (!formData.manufacturerId) return

    const selectedManufacturer = manufacturers.find((m) => m.id === formData.manufacturerId)

    onSave({
      productCode: formData.productCode.trim(),
      optionName: formData.optionName.trim(),
      manufacturerId: formData.manufacturerId,
      manufacturerName: selectedManufacturer?.name || '',
    })

    onOpenChange(false)
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-slate-600" />
            {isEdit ? '옵션 연결 수정' : '옵션 연결 추가'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? '옵션-제조사 연결 정보를 수정해요.' : '새로운 옵션-제조사 연결을 등록해요.'}
          </DialogDescription>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4 overflow-y-auto flex-1 pr-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="productCode">
                상품코드 <span className="text-rose-500">*</span>
              </Label>
              <Input
                aria-invalid={!!errors.productCode}
                className="aria-invalid:border-rose-500"
                id="productCode"
                onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                placeholder="예: OL-001"
                value={formData.productCode}
              />
              {errors.productCode && <p className="text-xs text-rose-500">{errors.productCode}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="optionName">
                옵션명 <span className="text-rose-500">*</span>
              </Label>
              <Input
                aria-invalid={!!errors.optionName}
                className="aria-invalid:border-rose-500"
                id="optionName"
                onChange={(e) => setFormData({ ...formData, optionName: e.target.value })}
                placeholder="예: 500ml x 2병"
                value={formData.optionName}
              />
              {errors.optionName && <p className="text-xs text-rose-500">{errors.optionName}</p>}
              <p className="text-xs text-slate-500">사방넷 엑셀의 옵션 열에 입력된 값과 동일하게 입력해 주세요</p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="manufacturerId">
                제조사 <span className="text-rose-500">*</span>
              </Label>
              <Select
                onValueChange={(v) => setFormData({ ...formData, manufacturerId: Number(v) })}
                value={formData.manufacturerId?.toString() ?? ''}
              >
                <SelectTrigger aria-invalid={!!errors.manufacturerId} className="aria-invalid:border-rose-500">
                  <SelectValue placeholder="제조사 선택" />
                </SelectTrigger>
                <SelectContent>
                  {manufacturers.map((m) => (
                    <SelectItem key={m.id} value={m.id.toString()}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.manufacturerId && <p className="text-xs text-rose-500">{errors.manufacturerId}</p>}
            </div>

            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              <p className="font-medium mb-1">💡 연결 우선순위</p>
              <ol className="list-decimal list-inside flex flex-col gap-0.5 text-xs">
                <li>파일 제조사 (제조사 열이 있으면)</li>
                <li>옵션 연결 (상품코드 + 옵션 조합)</li>
                <li>상품 연결 (옵션이 없으면)</li>
                <li>미연결 처리</li>
              </ol>
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 sm:gap-0 pt-4">
            <Button disabled={isSaving} onClick={() => onOpenChange(false)} type="button" variant="outline">
              취소
            </Button>
            <Button className="bg-slate-900 hover:bg-slate-800" disabled={isSaving} type="submit">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function getFormDataFromMapping(mapping: OptionManufacturerMapping | null) {
  return {
    productCode: mapping?.productCode ?? '',
    optionName: mapping?.optionName ?? '',
    manufacturerId: mapping?.manufacturerId ?? (null as number | null),
  }
}

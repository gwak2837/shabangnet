'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { type OptionManufacturerMapping, manufacturers } from '@/lib/mock-data'
import { Settings2, Loader2 } from 'lucide-react'

interface OptionMappingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mapping: OptionManufacturerMapping | null
  onSave: (data: Omit<OptionManufacturerMapping, 'id' | 'createdAt' | 'updatedAt'>) => void
}

export function OptionMappingModal({ open, onOpenChange, mapping, onSave }: OptionMappingModalProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    productCode: '',
    optionName: '',
    manufacturerId: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEdit = !!mapping

  useEffect(() => {
    if (mapping) {
      setFormData({
        productCode: mapping.productCode,
        optionName: mapping.optionName,
        manufacturerId: mapping.manufacturerId,
      })
    } else {
      setFormData({
        productCode: '',
        optionName: '',
        manufacturerId: '',
      })
    }
    setErrors({})
  }, [mapping, open])

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.productCode.trim()) {
      newErrors.productCode = '상품코드를 입력하세요'
    }
    if (!formData.optionName.trim()) {
      newErrors.optionName = '옵션명을 입력하세요'
    }
    if (!formData.manufacturerId) {
      newErrors.manufacturerId = '제조사를 선택하세요'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setIsSaving(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800))

    const selectedManufacturer = manufacturers.find((m) => m.id === formData.manufacturerId)

    onSave({
      productCode: formData.productCode.trim(),
      optionName: formData.optionName.trim(),
      manufacturerId: formData.manufacturerId,
      manufacturerName: selectedManufacturer?.name || '',
    })

    setIsSaving(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Settings2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle>{isEdit ? '옵션 매핑 수정' : '옵션 매핑 추가'}</DialogTitle>
              <DialogDescription>
                {isEdit ? '옵션-제조사 매핑 정보를 수정합니다.' : '새로운 옵션-제조사 매핑을 등록합니다.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="productCode">
              상품코드 <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="productCode"
              value={formData.productCode}
              onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
              placeholder="예: OL-001"
              className={errors.productCode ? 'border-rose-500' : ''}
            />
            {errors.productCode && <p className="text-xs text-rose-500">{errors.productCode}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="optionName">
              옵션명 <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="optionName"
              value={formData.optionName}
              onChange={(e) => setFormData({ ...formData, optionName: e.target.value })}
              placeholder="예: 500ml x 2병"
              className={errors.optionName ? 'border-rose-500' : ''}
            />
            {errors.optionName && <p className="text-xs text-rose-500">{errors.optionName}</p>}
            <p className="text-xs text-slate-500">
              사방넷 엑셀의 옵션 열에 입력된 값과 동일하게 입력하세요
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manufacturerId">
              제조사 <span className="text-rose-500">*</span>
            </Label>
            <Select value={formData.manufacturerId} onValueChange={(v) => setFormData({ ...formData, manufacturerId: v })}>
              <SelectTrigger className={errors.manufacturerId ? 'border-rose-500' : ''}>
                <SelectValue placeholder="제조사 선택" />
              </SelectTrigger>
              <SelectContent>
                {manufacturers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.manufacturerId && <p className="text-xs text-rose-500">{errors.manufacturerId}</p>}
          </div>

          <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            <p className="font-medium mb-1">💡 매핑 우선순위</p>
            <ol className="list-decimal list-inside space-y-0.5 text-xs">
              <li>옵션 매핑 (상품코드 + 옵션 조합)</li>
              <li>상품 매핑 (상품코드 기준)</li>
              <li>미매핑 처리</li>
            </ol>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              취소
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-slate-900 hover:bg-slate-800">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : isEdit ? (
                '수정'
              ) : (
                '추가'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


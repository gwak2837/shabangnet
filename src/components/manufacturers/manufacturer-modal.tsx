'use client'

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
import { type Manufacturer, type InvoiceTemplate, defaultInvoiceTemplate, invoiceTemplates } from '@/lib/mock-data'
import { Building2, ChevronDown, ChevronUp, FileSpreadsheet, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface ManufacturerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  manufacturer: Manufacturer | null
  onSave: (data: Partial<Manufacturer>, invoiceTemplate?: Partial<InvoiceTemplate>) => void
  isSaving?: boolean
}

function getFormDataFromManufacturer(manufacturer: Manufacturer | null) {
  return {
    name: manufacturer?.name ?? '',
    contactName: manufacturer?.contactName ?? '',
    email: manufacturer?.email ?? '',
    ccEmail: manufacturer?.ccEmail ?? '',
    phone: manufacturer?.phone ?? '',
  }
}

function getInvoiceTemplateFromManufacturer(manufacturer: Manufacturer | null): Partial<InvoiceTemplate> {
  if (!manufacturer) {
    return { ...defaultInvoiceTemplate }
  }
  const existingTemplate = invoiceTemplates.find((t) => t.manufacturerId === manufacturer.id)
  return existingTemplate || { ...defaultInvoiceTemplate }
}

export function ManufacturerModal({
  open,
  onOpenChange,
  manufacturer,
  onSave,
  isSaving = false,
}: ManufacturerModalProps) {
  const [formData, setFormData] = useState(() => getFormDataFromManufacturer(manufacturer))
  const [invoiceTemplate, setInvoiceTemplate] = useState(() => getInvoiceTemplateFromManufacturer(manufacturer))
  const [showInvoiceSettings, setShowInvoiceSettings] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [prevManufacturerId, setPrevManufacturerId] = useState(manufacturer?.id)
  const [prevOpen, setPrevOpen] = useState(open)
  const isEdit = !!manufacturer

  if (manufacturer?.id !== prevManufacturerId || (open && !prevOpen)) {
    setPrevManufacturerId(manufacturer?.id)
    setPrevOpen(open)
    setFormData(getFormDataFromManufacturer(manufacturer))
    setInvoiceTemplate(getInvoiceTemplateFromManufacturer(manufacturer))
    setShowInvoiceSettings(false)
    setErrors({})
  } else if (open !== prevOpen) {
    setPrevOpen(open)
  }

  function validate() {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = '제조사명을 입력하세요'
    }
    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력하세요'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식을 입력하세요'
    }
    if (formData.ccEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ccEmail)) {
      newErrors.ccEmail = '올바른 이메일 형식을 입력하세요'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validate()) return

    onSave(
      {
        ...formData,
        ccEmail: formData.ccEmail || undefined,
      },
      invoiceTemplate,
    )

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <Building2 className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <DialogTitle>{isEdit ? '제조사 수정' : '제조사 추가'}</DialogTitle>
              <DialogDescription>
                {isEdit ? '제조사 정보를 수정합니다.' : '새로운 제조사를 등록합니다.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2">
            <div className="space-y-2">
              <Label htmlFor="name">
                제조사명 <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="예: 농심식품"
                className={errors.name ? 'border-rose-500' : ''}
              />
              {errors.name && <p className="text-xs text-rose-500">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactName">담당자명</Label>
              <Input
                id="contactName"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                placeholder="예: 김영희"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                이메일 <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="예: contact@company.com"
                className={errors.email ? 'border-rose-500' : ''}
              />
              {errors.email && <p className="text-xs text-rose-500">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ccEmail">참조 이메일 (CC)</Label>
              <Input
                id="ccEmail"
                type="email"
                value={formData.ccEmail}
                onChange={(e) => setFormData({ ...formData, ccEmail: e.target.value })}
                placeholder="예: order@company.com"
                className={errors.ccEmail ? 'border-rose-500' : ''}
              />
              {errors.ccEmail && <p className="text-xs text-rose-500">{errors.ccEmail}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">전화번호</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="예: 02-1234-5678"
              />
            </div>

            {/* Invoice Template Settings (Collapsible) */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowInvoiceSettings(!showInvoiceSettings)}
                className="flex items-center justify-between w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">송장 양식 설정</span>
                </div>
                {showInvoiceSettings ? (
                  <ChevronUp className="h-4 w-4 text-slate-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                )}
              </button>

              {showInvoiceSettings && (
                <div className="p-4 space-y-4 bg-white">
                  <p className="text-xs text-slate-500">
                    거래처에서 받은 송장 파일의 컬럼 위치를 설정합니다. 기본값으로 대부분의 양식에 대응됩니다.
                  </p>

                  {/* Column Index Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">컬럼 지정 방식</Label>
                      <p className="text-xs text-slate-500">
                        {invoiceTemplate.useColumnIndex ? 'A, B, C 형식 (엑셀 열)' : '헤더명으로 찾기'}
                      </p>
                    </div>
                    <Switch
                      checked={invoiceTemplate.useColumnIndex}
                      onCheckedChange={(checked) => setInvoiceTemplate({ ...invoiceTemplate, useColumnIndex: checked })}
                    />
                  </div>

                  {/* Column Mappings */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">주문번호 컬럼</Label>
                      <Input
                        value={invoiceTemplate.orderNumberColumn}
                        onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, orderNumberColumn: e.target.value })}
                        placeholder={invoiceTemplate.useColumnIndex ? 'A' : '주문번호'}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">택배사 컬럼</Label>
                      <Input
                        value={invoiceTemplate.courierColumn}
                        onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, courierColumn: e.target.value })}
                        placeholder={invoiceTemplate.useColumnIndex ? 'B' : '택배사'}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">송장번호 컬럼</Label>
                      <Input
                        value={invoiceTemplate.trackingNumberColumn}
                        onChange={(e) =>
                          setInvoiceTemplate({ ...invoiceTemplate, trackingNumberColumn: e.target.value })
                        }
                        placeholder={invoiceTemplate.useColumnIndex ? 'C' : '송장번호'}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  {/* Row Settings */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">헤더 행 번호</Label>
                      <Input
                        type="number"
                        min={1}
                        value={invoiceTemplate.headerRow}
                        onChange={(e) =>
                          setInvoiceTemplate({ ...invoiceTemplate, headerRow: parseInt(e.target.value) || 1 })
                        }
                        placeholder="1"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">데이터 시작 행</Label>
                      <Input
                        type="number"
                        min={1}
                        value={invoiceTemplate.dataStartRow}
                        onChange={(e) =>
                          setInvoiceTemplate({
                            ...invoiceTemplate,
                            dataStartRow: parseInt(e.target.value) || 2,
                          })
                        }
                        placeholder="2"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-4 flex-shrink-0">
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

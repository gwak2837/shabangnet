'use client'

import { Building2, ChevronDown, ChevronUp, FileSpreadsheet, Loader2, Trash2, Upload } from 'lucide-react'
import { useCallback, useState } from 'react'

import { SABANGNET_COLUMNS } from '@/common/constants'
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
import { defaultInvoiceTemplate, type InvoiceTemplate, type Manufacturer } from '@/services/manufacturers.types'

import { analyzeOrderTemplate } from './actions'

// 발주서 템플릿 타입
interface OrderTemplate {
  columnMappings: Record<string, string>
  dataStartRow: number
  fixedValues: Record<string, string>
  headerRow: number
  templateFileName?: string
}

const defaultOrderTemplate: OrderTemplate = {
  headerRow: 1,
  dataStartRow: 2,
  columnMappings: {},
  fixedValues: {},
}

interface ManufacturerModalProps {
  isSaving?: boolean
  manufacturer: Manufacturer | null
  onOpenChange: (open: boolean) => void
  onSave: (
    data: Partial<Manufacturer>,
    invoiceTemplate?: Partial<InvoiceTemplate>,
    orderTemplate?: Partial<OrderTemplate>,
  ) => void
  open: boolean
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
  const [orderTemplate, setOrderTemplate] = useState<OrderTemplate>(defaultOrderTemplate)
  const [showInvoiceSettings, setShowInvoiceSettings] = useState(false)
  const [showOrderTemplateSettings, setShowOrderTemplateSettings] = useState(false)
  const [templateHeaders, setTemplateHeaders] = useState<string[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [prevManufacturerId, setPrevManufacturerId] = useState(manufacturer?.id)
  const [prevOpen, setPrevOpen] = useState(open)
  const isEdit = !!manufacturer

  if (manufacturer?.id !== prevManufacturerId || (open && !prevOpen)) {
    setPrevManufacturerId(manufacturer?.id)
    setPrevOpen(open)
    setFormData(getFormDataFromManufacturer(manufacturer))
    setInvoiceTemplate(getInvoiceTemplateFromManufacturer(manufacturer))
    setOrderTemplate(defaultOrderTemplate)
    setShowInvoiceSettings(false)
    setShowOrderTemplateSettings(false)
    setTemplateHeaders([])
    setErrors({})
  } else if (open !== prevOpen) {
    setPrevOpen(open)
  }

  // 템플릿 파일 업로드 및 분석
  const handleTemplateUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setIsAnalyzing(true)

      try {
        const fileBuffer = await file.arrayBuffer()
        const result = await analyzeOrderTemplate(fileBuffer)

        if (result.success && result.analysis) {
          setTemplateHeaders(result.analysis.headers || [])
          setOrderTemplate({
            ...orderTemplate,
            templateFileName: file.name,
            headerRow: result.analysis.headerRow,
            dataStartRow: result.analysis.dataStartRow,
            columnMappings: result.analysis.suggestedMappings || {},
          })
        }
      } catch (error) {
        console.error('Template analysis failed:', error)
      } finally {
        setIsAnalyzing(false)
      }
    },
    [orderTemplate],
  )

  // 매핑 업데이트
  const updateMapping = (sabangnetKey: string, column: string) => {
    setOrderTemplate({
      ...orderTemplate,
      columnMappings: {
        ...orderTemplate.columnMappings,
        [sabangnetKey]: column,
      },
    })
  }

  // 매핑 삭제
  const removeMapping = (sabangnetKey: string) => {
    const newMappings = { ...orderTemplate.columnMappings }
    delete newMappings[sabangnetKey]
    setOrderTemplate({
      ...orderTemplate,
      columnMappings: newMappings,
    })
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
      orderTemplate,
    )

    onOpenChange(false)
  }

  // 주요 사방넷 컬럼 (매핑 UI에 표시)
  const mainSabangnetColumns = SABANGNET_COLUMNS.filter((col) =>
    [
      'address',
      'memo',
      'optionName',
      'orderName',
      'orderNumber',
      'productName',
      'quantity',
      'recipientMobile',
      'recipientName',
    ].includes(col.key),
  )

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg max-h-[90vh]">
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

        <form className="flex flex-col" onSubmit={handleSubmit}>
          <div className="max-h-[55vh] overflow-y-auto flex flex-col gap-4 pr-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">
                제조사명 <span className="text-rose-500">*</span>
              </Label>
              <Input
                className={errors.name ? 'border-rose-500' : ''}
                id="name"
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="예: 농심식품"
                value={formData.name}
              />
              {errors.name && <p className="text-xs text-rose-500">{errors.name}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="contactName">담당자명</Label>
              <Input
                id="contactName"
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                placeholder="예: 김영희"
                value={formData.contactName}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">
                이메일 <span className="text-rose-500">*</span>
              </Label>
              <Input
                className={errors.email ? 'border-rose-500' : ''}
                id="email"
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="예: contact@company.com"
                type="email"
                value={formData.email}
              />
              {errors.email && <p className="text-xs text-rose-500">{errors.email}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ccEmail">참조 이메일 (CC)</Label>
              <Input
                className={errors.ccEmail ? 'border-rose-500' : ''}
                id="ccEmail"
                onChange={(e) => setFormData({ ...formData, ccEmail: e.target.value })}
                placeholder="예: order@company.com"
                type="email"
                value={formData.ccEmail}
              />
              {errors.ccEmail && <p className="text-xs text-rose-500">{errors.ccEmail}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">전화번호</Label>
              <Input
                id="phone"
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="예: 02-1234-5678"
                type="tel"
                value={formData.phone}
              />
            </div>

            {/* Order Template Settings (발주서 양식) - Collapsible */}
            <div className="border border-blue-200 rounded-lg overflow-hidden">
              <button
                className="flex items-center justify-between w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 transition-colors"
                onClick={() => setShowOrderTemplateSettings(!showOrderTemplateSettings)}
                type="button"
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">발주서 양식 설정</span>
                </div>
                {showOrderTemplateSettings ? (
                  <ChevronUp className="h-4 w-4 text-blue-600" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-blue-600" />
                )}
              </button>

              {showOrderTemplateSettings && (
                <div className="p-4 flex flex-col gap-4 bg-background/50">
                  <p className="text-xs text-slate-500">
                    제조사의 발주서 양식 파일을 업로드하면 컬럼 구조를 자동으로 분석합니다.
                  </p>

                  {/* Template Upload */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs">양식 파일 업로드</Label>
                    <div className="flex items-center gap-2">
                      <label className="flex-1">
                        <input accept=".xlsx,.xls" className="hidden" onChange={handleTemplateUpload} type="file" />
                        <div className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                          <Upload className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-600">
                            {orderTemplate.templateFileName || '양식 파일 선택...'}
                          </span>
                        </div>
                      </label>
                      {isAnalyzing && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                    </div>
                  </div>

                  {/* Row Settings */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">헤더 행 번호</Label>
                      <Input
                        className="h-8 text-sm"
                        min={1}
                        onChange={(e) =>
                          setOrderTemplate({ ...orderTemplate, headerRow: parseInt(e.target.value) || 1 })
                        }
                        placeholder="1"
                        type="number"
                        value={orderTemplate.headerRow}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">데이터 시작 행</Label>
                      <Input
                        className="h-8 text-sm"
                        min={1}
                        onChange={(e) =>
                          setOrderTemplate({ ...orderTemplate, dataStartRow: parseInt(e.target.value) || 2 })
                        }
                        placeholder="2"
                        type="number"
                        value={orderTemplate.dataStartRow}
                      />
                    </div>
                  </div>

                  {/* Column Mappings */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs">컬럼 매핑</Label>
                    <p className="text-xs text-slate-400">사방넷 데이터를 제조사 양식의 어느 열에 넣을지 설정합니다.</p>
                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                      {mainSabangnetColumns.map((col) => (
                        <div className="flex items-center gap-2" key={col.key}>
                          <span className="text-xs text-slate-600 w-24 truncate">{col.label}</span>
                          <span className="text-slate-400">→</span>
                          <Select
                            onValueChange={(value) => {
                              if (value === '__none__') {
                                removeMapping(col.key)
                              } else {
                                updateMapping(col.key, value)
                              }
                            }}
                            value={orderTemplate.columnMappings[col.key] || '__none__'}
                          >
                            <SelectTrigger className="h-7 text-xs flex-1">
                              <SelectValue placeholder="컬럼 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">미지정</SelectItem>
                              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'].map(
                                (letter) => (
                                  <SelectItem key={letter} value={letter}>
                                    {letter}열{' '}
                                    {templateHeaders[letter.charCodeAt(0) - 65]
                                      ? `(${templateHeaders[letter.charCodeAt(0) - 65]})`
                                      : ''}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                          {orderTemplate.columnMappings[col.key] && (
                            <button
                              className="p-1 text-slate-400 hover:text-rose-500"
                              onClick={() => removeMapping(col.key)}
                              type="button"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Invoice Template Settings (송장 양식) - Collapsible */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <button
                className="flex items-center justify-between w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                onClick={() => setShowInvoiceSettings(!showInvoiceSettings)}
                type="button"
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
                <div className="p-4 flex flex-col gap-4 bg-background/50">
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
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">주문번호 컬럼</Label>
                      <Input
                        className="h-8 text-sm"
                        onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, orderNumberColumn: e.target.value })}
                        placeholder={invoiceTemplate.useColumnIndex ? 'A' : '주문번호'}
                        value={invoiceTemplate.orderNumberColumn}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">택배사 컬럼</Label>
                      <Input
                        className="h-8 text-sm"
                        onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, courierColumn: e.target.value })}
                        placeholder={invoiceTemplate.useColumnIndex ? 'B' : '택배사'}
                        value={invoiceTemplate.courierColumn}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">송장번호 컬럼</Label>
                      <Input
                        className="h-8 text-sm"
                        onChange={(e) =>
                          setInvoiceTemplate({ ...invoiceTemplate, trackingNumberColumn: e.target.value })
                        }
                        placeholder={invoiceTemplate.useColumnIndex ? 'C' : '송장번호'}
                        value={invoiceTemplate.trackingNumberColumn}
                      />
                    </div>
                  </div>

                  {/* Row Settings */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">헤더 행 번호</Label>
                      <Input
                        className="h-8 text-sm"
                        min={1}
                        onChange={(e) =>
                          setInvoiceTemplate({ ...invoiceTemplate, headerRow: parseInt(e.target.value) || 1 })
                        }
                        placeholder="1"
                        type="number"
                        value={invoiceTemplate.headerRow}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">데이터 시작 행</Label>
                      <Input
                        className="h-8 text-sm"
                        min={1}
                        onChange={(e) =>
                          setInvoiceTemplate({
                            ...invoiceTemplate,
                            dataStartRow: parseInt(e.target.value) || 2,
                          })
                        }
                        placeholder="2"
                        type="number"
                        value={invoiceTemplate.dataStartRow}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-4 flex-shrink-0">
            <Button disabled={isSaving} onClick={() => onOpenChange(false)} type="button" variant="outline">
              취소
            </Button>
            <Button className="bg-slate-900 hover:bg-slate-800" disabled={isSaving} type="submit">
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

function getFormDataFromManufacturer(manufacturer: Manufacturer | null) {
  return {
    name: manufacturer?.name ?? '',
    contactName: manufacturer?.contactName ?? '',
    email: manufacturer?.email ?? '',
    ccEmail: manufacturer?.ccEmail ?? '',
    phone: manufacturer?.phone ?? '',
  }
}

function getInvoiceTemplateFromManufacturer(_manufacturer: Manufacturer | null): Partial<InvoiceTemplate> {
  // Invoice template loading is now handled async via API
  // Default template is used initially, actual template should be fetched separately
  return { ...defaultInvoiceTemplate }
}

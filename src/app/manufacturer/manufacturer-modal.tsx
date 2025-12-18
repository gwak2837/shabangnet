'use client'

import { useQuery } from '@tanstack/react-query'
import { FileSpreadsheet, Loader2, Save } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import type { TemplateTokenOption } from '@/app/settings/order/common-order-template/template-token-input'
import type { TemplateAnalysis } from '@/lib/excel'
import type { InvoiceTemplate, Manufacturer } from '@/services/manufacturers.types'

import {
  analyzeCurrentManufacturerOrderTemplate,
  deleteManufacturerOrderTemplate,
  updateManufacturerBundle,
} from '@/app/manufacturer/actions'
import { analyzeOrderTemplateFile } from '@/app/settings/order/common-order-template/action'
import {
  CommonOrderTemplateColumnEditor,
  type CommonTemplateColumnRule,
  type CommonTemplateFieldOption,
} from '@/app/settings/order/common-order-template/common-order-template-column-editor'
import { queryKeys } from '@/common/constants/query-keys'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
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
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { useServerAction } from '@/hooks/use-server-action'
import { getInvoiceTemplateOrDefault, getOrderTemplate } from '@/services/manufacturers'

interface InvoiceTemplateDraft {
  courierColumn: string
  dataStartRow: number
  headerRow: number
  orderNumberColumn: string
  trackingNumberColumn: string
  useColumnIndex: boolean
}

interface ManufacturerDraft {
  ccEmail: string
  contactName: string
  email: string
  phone: string
}

interface ManufacturerModalProps {
  manufacturer: Manufacturer | null
  onOpenChange: (open: boolean) => void
  open: boolean
}

type OrderTemplateData = Awaited<ReturnType<typeof getOrderTemplate>>

interface OrderTemplateDraft {
  dataStartRow: number
  headerRow: number
}

const ORDER_FIELD_OPTIONS: CommonTemplateFieldOption[] = [
  { key: 'sabangnetOrderNumber', label: '사방넷주문번호' },
  { key: 'mallOrderNumber', label: '쇼핑몰주문번호' },
  { key: 'subOrderNumber', label: '부주문번호' },
  { key: 'orderName', label: '주문인' },
  { key: 'recipientName', label: '받는인' },
  { key: 'orderMobile', label: '주문인 핸드폰' },
  { key: 'orderPhone', label: '주문인 연락처' },
  { key: 'recipientMobile', label: '받는인 핸드폰' },
  { key: 'recipientPhone', label: '받는인 연락처' },
  { key: 'postalCode', label: '우편번호' },
  { key: 'address', label: '배송지' },
  { key: 'productName', label: '상품명' },
  { key: 'optionName', label: '옵션' },
  { key: 'quantity', label: '수량' },
  { key: 'paymentAmount', label: '결제금액' },
  { key: 'memo', label: '전언' },
  { key: 'productCode', label: '상품코드' },
  { key: 'mallProductNumber', label: '쇼핑몰상품번호' },
  { key: 'shoppingMall', label: '사이트' },
  { key: 'manufacturer', label: '제조사' },
  { key: 'courier', label: '택배사' },
  { key: 'trackingNumber', label: '송장번호' },
  { key: 'logisticsNote', label: '물류전달사항' },
  { key: 'productAbbr', label: '상품약어' },
  { key: 'modelNumber', label: '모델번호' },
  { key: 'fulfillmentType', label: '주문유형' },
  { key: 'cjDate', label: '씨제이날짜' },
  { key: 'collectedAt', label: '수집일시' },
]

const TEMPLATE_TOKENS: TemplateTokenOption[] = [
  // 주문 데이터(한글 토큰)
  { label: '사방넷주문번호', token: '사방넷주문번호' },
  { label: '쇼핑몰주문번호', token: '쇼핑몰주문번호' },
  { label: '부주문번호', token: '부주문번호' },
  { label: '주문인', token: '주문인' },
  { label: '받는인', token: '받는인' },
  { label: '주문인연락처', token: '주문인연락처' },
  { label: '주문인핸드폰', token: '주문인핸드폰' },
  { label: '받는인연락처', token: '받는인연락처' },
  { label: '받는인핸드폰', token: '받는인핸드폰' },
  { label: '우편번호', token: '우편번호' },
  { label: '배송지', token: '배송지' },
  { label: '전언', token: '전언' },
  { label: '상품명', token: '상품명' },
  { label: '옵션', token: '옵션' },
  { label: '수량', token: '수량' },
  { label: '결제금액', token: '결제금액' },
  { label: '상품코드', token: '상품코드' },
  { label: '쇼핑몰상품번호', token: '쇼핑몰상품번호' },
  { label: '사이트', token: '사이트' },
  { label: '제조사', token: '제조사' },
  { label: '택배사', token: '택배사' },
  { label: '송장번호', token: '송장번호' },
  { label: '물류전달사항', token: '물류전달사항' },
  { label: '상품약어', token: '상품약어' },
  { label: '모델번호', token: '모델번호' },
  { label: '주문유형', token: '주문유형' },
  { label: '씨제이날짜', token: '씨제이날짜' },
  { label: '수집일시', token: '수집일시' },

  // 공통 변수
  { label: '제조사명', token: '제조사명' },
  { label: '날짜', token: '날짜' },
  { label: '총건수', token: '총건수' },
  { label: '총수량', token: '총수량' },
  { label: '총금액', token: '총금액' },
]

interface ManufacturerModalBodyProps {
  invoiceTemplate: InvoiceTemplate
  isFetchingStoredAnalysis: boolean
  isSaving: boolean
  manufacturer: Manufacturer
  onClose: () => void
  onSave: (input: Parameters<typeof updateManufacturerBundle>[0]) => void
  orderTemplate: OrderTemplateData
  storedAnalysis: TemplateAnalysis | null
}

export function ManufacturerModal({ open, onOpenChange, manufacturer }: ManufacturerModalProps) {
  const manufacturerId = manufacturer?.id ?? 0
  const canQuery = open && manufacturerId > 0

  const { data: invoiceTemplate, isFetching: isFetchingInvoiceTemplate } = useQuery({
    queryKey: queryKeys.invoiceTemplates.manufacturer(manufacturerId),
    queryFn: () => getInvoiceTemplateOrDefault(manufacturerId),
    enabled: canQuery,
  })

  const { data: orderTemplate, isFetching: isFetchingOrderTemplate } = useQuery({
    queryKey: queryKeys.orderTemplates.manufacturer(manufacturerId),
    queryFn: () => getOrderTemplate(manufacturerId),
    enabled: canQuery,
  })

  const { data: storedAnalysisResult, isFetching: isFetchingStoredAnalysis } = useQuery({
    queryKey: queryKeys.orderTemplates.manufacturerAnalysis(manufacturerId),
    queryFn: () => analyzeCurrentManufacturerOrderTemplate(manufacturerId),
    enabled: canQuery,
  })

  const storedAnalysis = storedAnalysisResult?.success ? (storedAnalysisResult.analysis ?? null) : null

  const [isSaving, saveBundle] = useServerAction(updateManufacturerBundle, {
    invalidateKeys: [
      queryKeys.manufacturers.all,
      queryKeys.orders.all,
      queryKeys.invoiceTemplates.all,
      queryKeys.orderTemplates.manufacturerAll,
    ],
    onSuccess: () => {
      toast.success('저장됐어요')
      onOpenChange(false)
    },
    onError: (error) => toast.error(error),
  })

  function handleOpenChange(nextOpen: boolean) {
    if (!isSaving) {
      onOpenChange(nextOpen)
    }
  }

  if (!manufacturer) {
    return null
  }

  const isLoading = isFetchingInvoiceTemplate || isFetchingOrderTemplate

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>제조사 정보 수정</DialogTitle>
          <DialogDescription>기본 정보와 템플릿 설정을 수정해요. 제조사명은 변경할 수 없어요.</DialogDescription>
        </DialogHeader>

        {isLoading || !invoiceTemplate || typeof orderTemplate === 'undefined' ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ManufacturerModalBody
            invoiceTemplate={invoiceTemplate}
            isFetchingStoredAnalysis={isFetchingStoredAnalysis}
            isSaving={isSaving}
            manufacturer={manufacturer}
            onClose={() => onOpenChange(false)}
            onSave={saveBundle}
            orderTemplate={orderTemplate}
            storedAnalysis={storedAnalysis}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function buildOrderTemplateConfig(columnRules: Record<string, CommonTemplateColumnRule>): {
  columnMappings: Record<string, string>
  fixedValues?: Record<string, string>
  fieldRuleCount: number
} {
  const columnMappings: Record<string, string> = {}
  const fixedValues: Record<string, string> = {}
  let fieldRuleCount = 0

  for (const [col, rule] of Object.entries(columnRules)) {
    const columnLetter = col.trim().toUpperCase()
    if (!/^[A-Z]+$/.test(columnLetter)) continue

    if (rule.kind === 'field') {
      const fieldKey = rule.fieldKey.trim()
      if (!fieldKey) continue
      columnMappings[fieldKey] = columnLetter
      fieldRuleCount += 1
      continue
    }

    if (rule.kind === 'template') {
      const template = rule.template.trim()
      if (template.length === 0) continue
      fixedValues[columnLetter] = template
    }
  }

  return {
    columnMappings,
    fixedValues: Object.keys(fixedValues).length > 0 ? fixedValues : undefined,
    fieldRuleCount,
  }
}

function ManufacturerModalBody({
  invoiceTemplate,
  isFetchingStoredAnalysis,
  isSaving,
  manufacturer,
  onClose,
  onSave,
  orderTemplate,
  storedAnalysis,
}: ManufacturerModalBodyProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [manufacturerDraft, setManufacturerDraft] = useState<ManufacturerDraft>(() => ({
    contactName: manufacturer.contactName,
    email: manufacturer.email ?? '',
    ccEmail: manufacturer.ccEmail ?? '',
    phone: manufacturer.phone,
  }))

  const [invoiceDraft, setInvoiceDraft] = useState<InvoiceTemplateDraft>(() => toInvoiceTemplateDraft(invoiceTemplate))

  const [orderDraft, setOrderDraft] = useState<OrderTemplateDraft>(() => ({
    headerRow: orderTemplate?.headerRow ?? 1,
    dataStartRow: orderTemplate?.dataStartRow ?? 2,
  }))

  const [columnRules, setColumnRules] = useState<Record<string, CommonTemplateColumnRule>>(() =>
    parseInitialColumnRules(orderTemplate),
  )

  const [baseline] = useState(() => {
    return {
      manufacturer: {
        contactName: manufacturer.contactName,
        email: manufacturer.email ?? '',
        ccEmail: manufacturer.ccEmail ?? '',
        phone: manufacturer.phone,
      } satisfies ManufacturerDraft,
      invoice: toInvoiceTemplateDraft(invoiceTemplate),
      order: {
        headerRow: orderTemplate?.headerRow ?? 1,
        dataStartRow: orderTemplate?.dataStartRow ?? 2,
      } satisfies OrderTemplateDraft,
      columnRulesKey: serializeColumnRules(parseInitialColumnRules(orderTemplate)),
    }
  })

  const [uploadedOrderTemplateFile, setUploadedOrderTemplateFile] = useState<{
    buffer: ArrayBuffer
    name: string
  } | null>(null)
  const [analysis, setAnalysis] = useState<TemplateAnalysis | null>(null)

  const effectiveAnalysis = uploadedOrderTemplateFile ? analysis : storedAnalysis

  const [isDeletingOrderTemplate, deleteOrderTemplate] = useServerAction(deleteManufacturerOrderTemplate, {
    invalidateKeys: [
      queryKeys.orderTemplates.manufacturer(manufacturer.id),
      queryKeys.orderTemplates.manufacturerAnalysis(manufacturer.id),
      queryKeys.orders.all,
    ],
    onSuccess: (result) => {
      if (!result.success) return
      toast.success('제조사 템플릿이 삭제됐어요')
      onClose()
    },
  })

  const [isAnalyzingUpload, analyzeUploadTemplate] = useServerAction(analyzeOrderTemplateFile, {
    onSuccess: (result) => {
      if (!result.success || !result.analysis) return
      setAnalysis(result.analysis)
      setOrderDraft((prev) => ({
        ...prev,
        headerRow: result.analysis!.headerRow,
        dataStartRow: result.analysis!.dataStartRow,
      }))
      toast.success('템플릿 분석이 완료됐어요')
    },
  })

  const currentRulesKey = serializeColumnRules(columnRules)

  const isManufacturerDirty =
    manufacturerDraft.contactName !== baseline.manufacturer.contactName ||
    manufacturerDraft.email !== baseline.manufacturer.email ||
    manufacturerDraft.ccEmail !== baseline.manufacturer.ccEmail ||
    manufacturerDraft.phone !== baseline.manufacturer.phone

  const isInvoiceDirty =
    invoiceDraft.orderNumberColumn !== baseline.invoice.orderNumberColumn ||
    invoiceDraft.courierColumn !== baseline.invoice.courierColumn ||
    invoiceDraft.trackingNumberColumn !== baseline.invoice.trackingNumberColumn ||
    invoiceDraft.headerRow !== baseline.invoice.headerRow ||
    invoiceDraft.dataStartRow !== baseline.invoice.dataStartRow ||
    invoiceDraft.useColumnIndex !== baseline.invoice.useColumnIndex

  const isOrderDirty =
    Boolean(uploadedOrderTemplateFile) ||
    orderDraft.headerRow !== baseline.order.headerRow ||
    orderDraft.dataStartRow !== baseline.order.dataStartRow ||
    currentRulesKey !== baseline.columnRulesKey

  const canSave = !isSaving && (isManufacturerDirty || isInvoiceDirty || isOrderDirty)

  async function handleTemplateUpload(file: File) {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('xlsx 파일만 업로드할 수 있어요')
      return
    }

    const buffer = await file.arrayBuffer()
    setUploadedOrderTemplateFile({ name: file.name, buffer })
    analyzeUploadTemplate(buffer)
  }

  function applySuggestions() {
    const suggestedMappings = effectiveAnalysis?.suggestedMappings ?? {}
    const entries = Object.entries(suggestedMappings)
    if (entries.length === 0) {
      toast.error('적용할 추천 연결이 없어요')
      return
    }

    let applied = 0
    setColumnRules((prev) => {
      const next = { ...prev }
      for (const [fieldKey, columnLetter] of entries) {
        const col = columnLetter.trim().toUpperCase()
        if (!col) continue
        const existing = next[col]
        if (existing && existing.kind !== 'none') continue
        next[col] = { kind: 'field', fieldKey }
        applied += 1
      }
      return next
    })

    if (applied > 0) {
      toast.success(`추천 연결 ${applied}개를 적용했어요`)
    } else {
      toast('이미 설정된 컬럼이 많아서 적용할 게 없어요')
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!canSave) {
      return
    }

    const input: Parameters<typeof updateManufacturerBundle>[0] = { manufacturerId: manufacturer.id }

    if (isManufacturerDirty) {
      input.manufacturer = {
        contactName: normalizeToNullableString(manufacturerDraft.contactName),
        email: normalizeToNullableString(manufacturerDraft.email),
        ccEmail: normalizeToNullableString(manufacturerDraft.ccEmail),
        phone: normalizeToNullableString(manufacturerDraft.phone),
      }
    }

    if (isInvoiceDirty) {
      input.invoiceTemplate = {
        orderNumberColumn: invoiceDraft.orderNumberColumn,
        courierColumn: invoiceDraft.courierColumn,
        trackingNumberColumn: invoiceDraft.trackingNumberColumn,
        headerRow: invoiceDraft.headerRow,
        dataStartRow: invoiceDraft.dataStartRow,
        useColumnIndex: invoiceDraft.useColumnIndex,
      }
    }

    if (isOrderDirty) {
      const hasStoredTemplateFile = Boolean(orderTemplate?.templateFileName)
      const hasUploadedTemplateFile = Boolean(uploadedOrderTemplateFile)

      if (!hasStoredTemplateFile && !hasUploadedTemplateFile) {
        toast.error('발주서 템플릿 파일을 업로드해 주세요.')
        return
      }

      const { columnMappings, fixedValues, fieldRuleCount } = buildOrderTemplateConfig(columnRules)
      if (fieldRuleCount === 0) {
        toast.error('발주서 컬럼 연결이 비어있어요. 최소 1개 이상 연결해 주세요.')
        return
      }

      input.orderTemplate = {
        headerRow: orderDraft.headerRow,
        dataStartRow: orderDraft.dataStartRow,
        columnMappings,
        fixedValues,
        templateFileName: uploadedOrderTemplateFile?.name,
        templateFileBuffer: uploadedOrderTemplateFile?.buffer,
      }
    }

    onSave(input)
  }

  return (
    <form className="flex flex-col flex-1 min-h-0" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-5 overflow-y-auto flex-1 pr-2">
        {/* Basic */}
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">기본 정보</h3>
            <p className="text-xs text-muted-foreground">빈 값으로 저장하면 기존 값이 삭제돼요.</p>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="manufacturer-name">제조사명</Label>
              <Input aria-disabled disabled id="manufacturer-name" value={manufacturer.name} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="manufacturer-contact-name">담당자</Label>
              <Input
                id="manufacturer-contact-name"
                onChange={(e) => {
                  const value = e.currentTarget.value
                  setManufacturerDraft((prev) => ({ ...prev, contactName: value }))
                }}
                placeholder="예: 홍길동"
                value={manufacturerDraft.contactName}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="manufacturer-email">이메일</Label>
              <Input
                autoCapitalize="none"
                autoCorrect="off"
                id="manufacturer-email"
                onChange={(e) => {
                  const value = e.currentTarget.value
                  setManufacturerDraft((prev) => ({ ...prev, email: value }))
                }}
                placeholder="예: orders@example.com"
                type="email"
                value={manufacturerDraft.email}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="manufacturer-cc-email">CC 이메일</Label>
              <Input
                autoCapitalize="none"
                autoCorrect="off"
                id="manufacturer-cc-email"
                onChange={(e) => {
                  const value = e.currentTarget.value
                  setManufacturerDraft((prev) => ({ ...prev, ccEmail: value }))
                }}
                placeholder="예: a@example.com, b@example.com"
                value={manufacturerDraft.ccEmail}
              />
              <p className="text-xs text-muted-foreground">여러 개면 쉼표(,)로 구분해요.</p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="manufacturer-phone">전화번호</Label>
              <Input
                id="manufacturer-phone"
                inputMode="tel"
                onChange={(e) => {
                  const value = e.currentTarget.value
                  setManufacturerDraft((prev) => ({ ...prev, phone: value }))
                }}
                placeholder="예: 032-000-0000"
                type="tel"
                value={manufacturerDraft.phone}
              />
            </div>
          </div>
        </section>

        {/* Invoice template */}
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">송장 템플릿</h3>
              <p className="text-xs text-muted-foreground">송장 업로드 파일을 읽을 때 어떤 컬럼을 볼지 설정해요.</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={invoiceDraft.useColumnIndex}
                id="invoice-use-column-index"
                onCheckedChange={(checked) => setInvoiceDraft((prev) => ({ ...prev, useColumnIndex: checked }))}
              />
              <Label className="text-xs text-muted-foreground" htmlFor="invoice-use-column-index">
                컬럼 문자로 지정
              </Label>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="invoice-order-number">주문번호 {invoiceDraft.useColumnIndex ? '컬럼' : '헤더명'}</Label>
              <Input
                id="invoice-order-number"
                onChange={(e) => {
                  const value = e.currentTarget.value
                  setInvoiceDraft((prev) => ({ ...prev, orderNumberColumn: value }))
                }}
                placeholder={invoiceDraft.useColumnIndex ? '예: A' : '예: 사방넷주문번호'}
                value={invoiceDraft.orderNumberColumn}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="invoice-courier">택배사 {invoiceDraft.useColumnIndex ? '컬럼' : '헤더명'}</Label>
              <Input
                id="invoice-courier"
                onChange={(e) => {
                  const value = e.currentTarget.value
                  setInvoiceDraft((prev) => ({ ...prev, courierColumn: value }))
                }}
                placeholder={invoiceDraft.useColumnIndex ? '예: B' : '예: 택배사'}
                value={invoiceDraft.courierColumn}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="invoice-tracking">송장번호 {invoiceDraft.useColumnIndex ? '컬럼' : '헤더명'}</Label>
              <Input
                id="invoice-tracking"
                onChange={(e) => {
                  const value = e.currentTarget.value
                  setInvoiceDraft((prev) => ({ ...prev, trackingNumberColumn: value }))
                }}
                placeholder={invoiceDraft.useColumnIndex ? '예: C' : '예: 송장번호'}
                value={invoiceDraft.trackingNumberColumn}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="invoice-header-row">헤더 행</Label>
                <Input
                  id="invoice-header-row"
                  min={1}
                  onChange={(e) => {
                    const value = e.currentTarget.value
                    setInvoiceDraft((prev) => ({ ...prev, headerRow: toSafeInt(value, 1) }))
                  }}
                  type="number"
                  value={invoiceDraft.headerRow}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="invoice-data-start-row">데이터 시작 행</Label>
                <Input
                  id="invoice-data-start-row"
                  min={1}
                  onChange={(e) => {
                    const value = e.currentTarget.value
                    setInvoiceDraft((prev) => ({ ...prev, dataStartRow: toSafeInt(value, 2) }))
                  }}
                  type="number"
                  value={invoiceDraft.dataStartRow}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Order template */}
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">발주서 템플릿</h3>
            <p className="text-xs text-muted-foreground">
              제조사 템플릿이 “파일 + 컬럼 연결” 모두 유효할 때만 적용돼요. 아니면 공통 템플릿이 사용돼요.
            </p>
          </div>

          <div className="mt-4 grid gap-4">
            <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 px-3 py-2">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">템플릿 파일</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {uploadedOrderTemplateFile?.name || orderTemplate?.templateFileName || '업로드된 파일이 없어요'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <input
                    accept=".xlsx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.currentTarget.files?.[0]
                      if (!file) return
                      handleTemplateUpload(file)
                    }}
                    ref={fileInputRef}
                    type="file"
                  />
                  <Button size="sm" type="button" variant="outline">
                    파일 선택
                  </Button>
                </label>

                {uploadedOrderTemplateFile && (
                  <Button
                    onClick={() => {
                      setUploadedOrderTemplateFile(null)
                      setAnalysis(null)
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ''
                      }
                    }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    선택 해제
                  </Button>
                )}

                {orderTemplate ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        aria-disabled={isSaving || isDeletingOrderTemplate}
                        disabled={isSaving || isDeletingOrderTemplate}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        {isDeletingOrderTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        템플릿 삭제
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>제조사 템플릿을 삭제할까요?</AlertDialogTitle>
                        <AlertDialogDescription>
                          삭제하면 이 제조사는 발주서 템플릿을 사용해요. 나중에 다시 파일을 업로드하면 제조사 템플릿을
                          적용할 수 있어요.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            deleteOrderTemplate({ manufacturerId: manufacturer.id })
                          }}
                        >
                          삭제
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null}

                {(isAnalyzingUpload || isFetchingStoredAnalysis) && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
              <div className="flex flex-col gap-2">
                <Label htmlFor="order-template-header-row">헤더 행</Label>
                <Input
                  id="order-template-header-row"
                  min={1}
                  onChange={(e) => {
                    const value = e.currentTarget.value
                    setOrderDraft((prev) => ({ ...prev, headerRow: toSafeInt(value, 1) }))
                  }}
                  type="number"
                  value={orderDraft.headerRow}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="order-template-data-start-row">데이터 시작 행</Label>
                <Input
                  id="order-template-data-start-row"
                  min={1}
                  onChange={(e) => {
                    const value = e.currentTarget.value
                    setOrderDraft((prev) => ({ ...prev, dataStartRow: toSafeInt(value, 2) }))
                  }}
                  type="number"
                  value={orderDraft.dataStartRow}
                />
              </div>
            </div>

            <Separator />

            <div className="overflow-x-auto">
              <CommonOrderTemplateColumnEditor
                fieldOptions={ORDER_FIELD_OPTIONS}
                headers={effectiveAnalysis?.headers ?? []}
                lastUsedColumnIndex={effectiveAnalysis?.lastUsedColumnIndex}
                onApplySuggestions={applySuggestions}
                onChange={setColumnRules}
                sampleData={effectiveAnalysis?.sampleData ?? []}
                suggestionsCount={Object.keys(effectiveAnalysis?.suggestedMappings ?? {}).length}
                tokens={TEMPLATE_TOKENS}
                value={columnRules}
              />
            </div>
          </div>
        </section>
      </div>

      <DialogFooter className="gap-2 sm:gap-0 shrink-0 pt-4 border-t border-border">
        <Button disabled={isSaving} onClick={onClose} type="button" variant="outline">
          취소
        </Button>
        <Button disabled={!canSave} type="submit">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          저장
        </Button>
      </DialogFooter>
    </form>
  )
}

function normalizeToNullableString(raw: string): string | null {
  const v = raw.trim()
  return v.length > 0 ? v : null
}

function parseInitialColumnRules(template: OrderTemplateData): Record<string, CommonTemplateColumnRule> {
  const columnRules: Record<string, CommonTemplateColumnRule> = {}

  if (!template) {
    return columnRules
  }

  for (const [fieldKey, rawColumn] of Object.entries(template.columnMappings ?? {})) {
    const col = String(rawColumn ?? '')
      .trim()
      .toUpperCase()
    if (!/^[A-Z]+$/.test(col)) continue
    columnRules[col] = { kind: 'field', fieldKey }
  }

  for (const [rawKey, rawValue] of Object.entries(template.fixedValues ?? {})) {
    const key = String(rawKey ?? '').trim()
    const normalized = key.toUpperCase()
    const value = String(rawValue ?? '')
    if (!/^[A-Z]+$/.test(normalized)) continue
    columnRules[normalized] = { kind: 'template', template: value }
  }

  return columnRules
}

function serializeColumnRules(columnRules: Record<string, CommonTemplateColumnRule>): string {
  const keys = Object.keys(columnRules).sort((a, b) => a.localeCompare(b))
  return JSON.stringify(
    keys.map((key) => {
      const rule = columnRules[key]
      if (!rule || rule.kind === 'none') return [key, 'none']
      if (rule.kind === 'field') return [key, 'field', rule.fieldKey.trim()]
      return [key, 'template', rule.template.trim()]
    }),
  )
}

function toInvoiceTemplateDraft(template: InvoiceTemplate): InvoiceTemplateDraft {
  return {
    orderNumberColumn: template.orderNumberColumn,
    courierColumn: template.courierColumn,
    trackingNumberColumn: template.trackingNumberColumn,
    headerRow: template.headerRow,
    dataStartRow: template.dataStartRow,
    useColumnIndex: template.useColumnIndex,
  }
}

function toSafeInt(raw: string, fallback: number): number {
  const n = Number.parseInt(raw, 10)
  if (Number.isFinite(n) && n > 0) {
    return n
  }
  return fallback
}

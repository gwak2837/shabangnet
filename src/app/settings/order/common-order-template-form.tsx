'use client'

import { FileSpreadsheet, Loader2, Upload, Wand2 } from 'lucide-react'
import { type ChangeEvent, useState } from 'react'
import { toast } from 'sonner'

import type { CommonOrderTemplate } from '@/services/order-templates.types'

import { queryKeys } from '@/common/constants/query-keys'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCommonOrderTemplate } from '@/hooks/use-order-templates'
import { useServerAction } from '@/hooks/use-server-action'
import { analyzeOrderTemplateFile, upsertCommonOrderTemplate } from '@/services/order-templates'

const COLUMN_OPTIONS = buildColumnOptions(52) // A..AZ

const FIELD_OPTIONS: { key: string; label: string }[] = [
  { key: 'sabangnetOrderNumber', label: '사방넷주문번호' },
  { key: 'recipientName', label: '받는인' },
  { key: 'recipientMobile', label: '받는인 핸드폰' },
  { key: 'recipientPhone', label: '받는인 연락처' },
  { key: 'address', label: '배송지' },
  { key: 'postalCode', label: '우편번호' },
  { key: 'productName', label: '상품명' },
  { key: 'optionName', label: '옵션' },
  { key: 'quantity', label: '수량' },
  { key: 'paymentAmount', label: '결제금액' },
  { key: 'memo', label: '전언' },
  { key: 'productCode', label: '상품코드' },
  { key: 'mallProductNumber', label: '쇼핑몰상품번호' },
  { key: 'shoppingMall', label: '사이트' },
  { key: 'manufacturer', label: '제조사' },
]

interface CommonOrderTemplateFormInnerProps {
  initialDraft: CommonOrderTemplate
  initialFixedValuesJson: string
  initialHasExistingTemplate: boolean
}

export function CommonOrderTemplateForm() {
  const { data: currentTemplate, isLoading: isLoadingTemplate } = useCommonOrderTemplate()

  if (isLoadingTemplate) {
    return (
      <section className="glass-card p-0 overflow-hidden">
        <header className="px-6 pt-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-blue-500/10 to-blue-600/5 ring-1 ring-blue-500/10">
              <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">공통 발주서 템플릿</h2>
              <p className="text-sm text-muted-foreground">제조사 템플릿이 없을 때 이 템플릿으로 생성해요</p>
            </div>
          </div>
        </header>
        <div className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </div>
      </section>
    )
  }

  const initialDraft: CommonOrderTemplate = currentTemplate ?? {
    key: 'default',
    templateFileName: '',
    headerRow: 1,
    dataStartRow: 2,
    columnMappings: {},
    fixedValues: {},
  }
  const initialFixedValuesJson = JSON.stringify(initialDraft.fixedValues ?? {}, null, 2)

  const key = currentTemplate?.templateFileName
    ? `common-template:${currentTemplate.templateFileName}`
    : 'common-template:none'

  return (
    <CommonOrderTemplateFormInner
      initialDraft={initialDraft}
      initialFixedValuesJson={initialFixedValuesJson}
      initialHasExistingTemplate={Boolean(currentTemplate?.templateFileName)}
      key={key}
    />
  )
}

function buildColumnOptions(count: number): string[] {
  const options: string[] = []
  for (let i = 0; i < count; i++) {
    options.push(indexToColumnLetter(i))
  }
  return options
}

function columnLetterToIndex(column: string): number {
  const normalized = column.trim().toUpperCase()
  if (!/^[A-Z]+$/.test(normalized)) return -1

  let index = 0
  for (let i = 0; i < normalized.length; i++) {
    index *= 26
    index += normalized.charCodeAt(i) - 64
  }
  return index - 1
}

function CommonOrderTemplateFormInner({
  initialDraft,
  initialFixedValuesJson,
  initialHasExistingTemplate,
}: CommonOrderTemplateFormInnerProps) {
  const [draft, setDraft] = useState<CommonOrderTemplate>(initialDraft)
  const [templateHeaders, setTemplateHeaders] = useState<string[]>([])
  const [fixedValuesJson, setFixedValuesJson] = useState<string>(initialFixedValuesJson)
  const [uploadedFile, setUploadedFile] = useState<{ buffer: ArrayBuffer; name: string } | null>(null)

  const [isSaving, saveCommonTemplate] = useServerAction(upsertCommonOrderTemplate, {
    invalidateKeys: [queryKeys.orderTemplates.common],
    onSuccess: (result) => {
      if (result.success) {
        toast.success('공통 발주서 템플릿이 저장됐어요')
        setUploadedFile(null)
      }
    },
  })

  const [isAnalyzing, analyzeTemplate] = useServerAction(analyzeOrderTemplateFile, {
    onSuccess: (result) => {
      if (!result.success || !result.analysis) return
      const analysis = result.analysis

      setTemplateHeaders(analysis.headers || [])
      setDraft((prev) => ({
        ...prev,
        headerRow: analysis.headerRow,
        dataStartRow: analysis.dataStartRow,
        columnMappings: analysis.suggestedMappings || prev.columnMappings,
      }))
      toast.success('템플릿 분석이 완료됐어요')
    },
  })

  const hasExistingTemplate = initialHasExistingTemplate
  const hasUploadedTemplate = !!uploadedFile
  const canSave = hasExistingTemplate || hasUploadedTemplate

  async function handleTemplateUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('xlsx 파일만 업로드할 수 있어요')
      return
    }

    const buffer = await file.arrayBuffer()
    setUploadedFile({ name: file.name, buffer })
    setDraft((prev) => (prev ? { ...prev, templateFileName: file.name } : prev))

    analyzeTemplate(buffer)
  }

  function handleSave() {
    if (!draft) return
    let fixedValues: Record<string, string> | undefined
    try {
      const parsed = JSON.parse(fixedValuesJson) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        fixedValues = parsed as Record<string, string>
      } else {
        fixedValues = {}
      }
    } catch {
      toast.error('고정값 JSON 형식이 올바르지 않아요')
      return
    }

    saveCommonTemplate({
      headerRow: draft.headerRow,
      dataStartRow: draft.dataStartRow,
      columnMappings: draft.columnMappings,
      fixedValues,
      templateFileName: uploadedFile?.name,
      templateFileBuffer: uploadedFile?.buffer,
    })
  }

  return (
    <section className="glass-card p-0 overflow-hidden">
      <header className="px-6 pt-6">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-blue-500/10 to-blue-600/5 ring-1 ring-blue-500/10">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">공통 발주서 템플릿</h2>
            <p className="text-sm text-muted-foreground">제조사 템플릿이 없을 때 이 템플릿으로 생성해요</p>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">템플릿 파일</Label>
            <div className="flex items-center gap-2">
              <label className="flex-1">
                <input accept=".xlsx" className="hidden" onChange={handleTemplateUpload} type="file" />
                <div className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <Upload className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-600">
                    {uploadedFile?.name || draft.templateFileName || '공통 템플릿 파일 선택...'}
                  </span>
                </div>
              </label>
              {isAnalyzing && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
            </div>
            {!canSave && (
              <p className="text-xs text-amber-700">공통 템플릿을 업로드해야 발주서 생성/발송을 할 수 있어요.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">헤더 행 번호</Label>
              <Input
                min={1}
                onChange={(e) => setDraft({ ...draft, headerRow: parseInt(e.target.value, 10) || 1 })}
                type="number"
                value={draft.headerRow}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">데이터 시작 행</Label>
              <Input
                min={1}
                onChange={(e) => setDraft({ ...draft, dataStartRow: parseInt(e.target.value, 10) || 2 })}
                type="number"
                value={draft.dataStartRow}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            className="gap-2"
            disabled={isAnalyzing || (!uploadedFile?.buffer && !hasExistingTemplate)}
            onClick={() => {
              if (uploadedFile?.buffer) {
                analyzeTemplate(uploadedFile.buffer)
              } else {
                toast.error('분석할 템플릿 파일을 먼저 업로드해 주세요')
              }
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            <Wand2 className="h-4 w-4" />
            분석해서 연결 제안
          </Button>
          <Button disabled={isSaving || !canSave} onClick={handleSave} size="sm" type="button">
            저장
          </Button>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">컬럼 연결</Label>
          <p className="text-sm text-muted-foreground">
            사방넷 데이터(키)를 템플릿의 어느 열에 채울지 정해요. (시트는 항상 1장만 사용해요)
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {FIELD_OPTIONS.map((field) => (
              <div className="flex items-center gap-2" key={field.key}>
                <span className="w-28 shrink-0 text-sm text-slate-700">{field.label}</span>
                <span className="text-slate-400">→</span>
                <Select
                  onValueChange={(value) => {
                    const next = { ...draft.columnMappings }
                    if (value === '__none__') {
                      delete next[field.key]
                    } else {
                      next[field.key] = value
                    }
                    setDraft({ ...draft, columnMappings: next })
                  }}
                  value={draft.columnMappings[field.key] ?? '__none__'}
                >
                  <SelectTrigger className="h-9 flex-1">
                    <SelectValue placeholder="열 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">미지정</SelectItem>
                    {COLUMN_OPTIONS.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}열{' '}
                        {templateHeaders[columnLetterToIndex(col)]
                          ? `(${templateHeaders[columnLetterToIndex(col)]})`
                          : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">고정값 (선택)</Label>
          <p className="text-sm text-muted-foreground">
            템플릿의 특정 셀에 자동으로 넣을 값을 정의해요. 예:{' '}
            <code>{'{"B2": "{{manufacturerName}}", "B3": "{{date}}"}'}</code>
          </p>
          <textarea
            className="min-h-24 w-full rounded-md border border-slate-200 bg-background px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400/30"
            onChange={(e) => setFixedValuesJson(e.target.value)}
            value={fixedValuesJson}
          />
        </div>
      </div>
    </section>
  )
}

function indexToColumnLetter(index: number): string {
  let letter = ''
  let i = index
  while (i >= 0) {
    letter = String.fromCharCode((i % 26) + 65) + letter
    i = Math.floor(i / 26) - 1
  }
  return letter
}

'use client'

import { useQuery } from '@tanstack/react-query'
import { FileSpreadsheet, Loader2, Upload } from 'lucide-react'
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import type { TemplateAnalysis } from '@/lib/excel'

import { queryKeys } from '@/common/constants/query-keys'
import { SettingsIconBadge } from '@/components/settings/settings-icon-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useServerAction } from '@/hooks/use-server-action'

import type { CommonOrderTemplate } from './action'
import type { TemplateTokenOption } from './template-token-input'

import {
  analyzeCurrentCommonOrderTemplate,
  analyzeOrderTemplateFile,
  getCommonOrderTemplate,
  upsertCommonOrderTemplate,
} from './action'
import {
  CommonOrderTemplateColumnEditor,
  type CommonTemplateColumnRule,
  type CommonTemplateFieldOption,
} from './common-order-template-column-editor'
import { TestDownloadSection } from './test-download-section'

const FIELD_OPTIONS: CommonTemplateFieldOption[] = [
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

  // 공통 변수
  { label: '제조사명', token: '제조사명' },
  { label: '날짜', token: '날짜' },
  { label: '총건수', token: '총건수' },
  { label: '총수량', token: '총수량' },
  { label: '총금액', token: '총금액' },
]

interface CommonOrderTemplateFormInnerProps {
  initialDraft: CommonOrderTemplate
  initialHasExistingTemplate: boolean
  onDirtyChange?: (isDirty: boolean) => void
}

interface CommonOrderTemplateFormProps {
  onDirtyChange?: (isDirty: boolean) => void
}

export function CommonOrderTemplateForm({ onDirtyChange }: CommonOrderTemplateFormProps) {
  const { data: currentTemplate, isLoading: isLoadingTemplate } = useQuery({
    queryKey: queryKeys.orderTemplates.common,
    queryFn: getCommonOrderTemplate,
  })

  if (isLoadingTemplate) {
    return (
      <section className="rounded-xl border border-slate-200 bg-card p-0 shadow-sm overflow-hidden">
        <header className="px-6 pt-6">
          <div className="flex items-center gap-4">
            <SettingsIconBadge accent="blue" className="h-10 w-10" icon={FileSpreadsheet} />
            <div className="space-y-0.5">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">발주서 템플릿</h2>
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

  const key = currentTemplate?.templateFileName
    ? `common-template:${currentTemplate.templateFileName}`
    : 'common-template:none'

  return (
    <CommonOrderTemplateFormInner
      initialDraft={initialDraft}
      initialHasExistingTemplate={Boolean(currentTemplate?.templateFileName)}
      key={key}
      onDirtyChange={onDirtyChange}
    />
  )
}

function buildConfig(columnRules: Record<string, CommonTemplateColumnRule>): {
  columnMappings: Record<string, string>
  fixedValues?: Record<string, string>
  rowRuleCount: number
} {
  const columnMappings: Record<string, string> = {}
  const fixedValues: Record<string, string> = {}
  let rowRuleCount = 0

  for (const [col, rule] of Object.entries(columnRules)) {
    const columnLetter = col.trim().toUpperCase()
    if (!/^[A-Z]+$/.test(columnLetter)) continue

    if (rule.kind === 'field') {
      const fieldKey = rule.fieldKey.trim()
      if (!fieldKey) continue
      columnMappings[fieldKey] = columnLetter
      rowRuleCount += 1
      continue
    }

    if (rule.kind === 'template') {
      const template = rule.template.trim()
      if (template.length === 0) continue
      fixedValues[columnLetter] = template
      rowRuleCount += 1
      continue
    }
  }

  return {
    columnMappings,
    fixedValues: Object.keys(fixedValues).length > 0 ? fixedValues : undefined,
    rowRuleCount,
  }
}

function CommonOrderTemplateFormInner({
  initialDraft,
  initialHasExistingTemplate,
  onDirtyChange,
}: CommonOrderTemplateFormInnerProps) {
  const [draft, setDraft] = useState<CommonOrderTemplate>(initialDraft)
  const initialColumnRules = useMemo(() => parseInitialColumnRules(initialDraft), [initialDraft])
  const [columnRules, setColumnRules] = useState<Record<string, CommonTemplateColumnRule>>(() => initialColumnRules)
  const [uploadedFile, setUploadedFile] = useState<{ buffer: ArrayBuffer; name: string } | null>(null)
  const [analysis, setAnalysis] = useState<TemplateAnalysis | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [baselineDraft, setBaselineDraft] = useState<CommonOrderTemplate>(initialDraft)
  const [baselineColumnRules, setBaselineColumnRules] = useState<Record<string, CommonTemplateColumnRule>>(
    () => initialColumnRules,
  )
  const pendingBaselineRef = useRef<{
    draft: CommonOrderTemplate
    columnRules: Record<string, CommonTemplateColumnRule>
  } | null>(null)

  const [isSaving, saveCommonTemplate] = useServerAction(upsertCommonOrderTemplate, {
    invalidateKeys: [queryKeys.orderTemplates.common],
    onSuccess: (result) => {
      if (result.success) {
        toast.success('발주서 템플릿이 저장됐어요')
        setUploadedFile(null)
        const pending = pendingBaselineRef.current
        if (pending) {
          setBaselineDraft(pending.draft)
          setBaselineColumnRules(pending.columnRules)
          pendingBaselineRef.current = null
        }
      }
    },
  })

  const [isAnalyzingUpload, analyzeUploadTemplate] = useServerAction(analyzeOrderTemplateFile, {
    onSuccess: (result) => {
      if (!result.success || !result.analysis) return
      const analysis = result.analysis

      setAnalysis(analysis)
      setDraft((prev) => ({
        ...prev,
        headerRow: analysis.headerRow,
        dataStartRow: analysis.dataStartRow,
      }))
      toast.success('템플릿 분석이 완료됐어요')
    },
  })

  const hasExistingTemplate = initialHasExistingTemplate
  const hasUploadedTemplate = !!uploadedFile
  const canSave = hasExistingTemplate || hasUploadedTemplate

  const baselineRulesKey = serializeColumnRules(baselineColumnRules)
  const currentRulesKey = serializeColumnRules(columnRules)
  const isDirty =
    Boolean(uploadedFile) ||
    draft.templateFileName !== baselineDraft.templateFileName ||
    draft.headerRow !== baselineDraft.headerRow ||
    draft.dataStartRow !== baselineDraft.dataStartRow ||
    currentRulesKey !== baselineRulesKey

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const { data: storedAnalysisResult, isFetching: isFetchingStoredAnalysis } = useQuery({
    queryKey: queryKeys.orderTemplates.commonAnalysis(draft.templateFileName),
    queryFn: analyzeCurrentCommonOrderTemplate,
    enabled: hasExistingTemplate && !hasUploadedTemplate,
  })

  const effectiveAnalysis = hasUploadedTemplate
    ? analysis
    : storedAnalysisResult?.success
      ? (storedAnalysisResult.analysis ?? null)
      : null

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

    analyzeUploadTemplate(buffer)
  }

  function handleCancel() {
    setDraft(baselineDraft)
    setColumnRules(baselineColumnRules)
    setUploadedFile(null)
    setAnalysis(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
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

  function handleSave() {
    const { columnMappings, fixedValues, rowRuleCount } = buildConfig(columnRules)

    if (rowRuleCount === 0) {
      toast.error('컬럼 설정이 비어있어요. 최소 1개 이상 연결하거나 직접 입력을 추가해 주세요.')
      return
    }

    pendingBaselineRef.current = { draft, columnRules }

    saveCommonTemplate({
      headerRow: draft.headerRow,
      dataStartRow: draft.dataStartRow,
      columnMappings,
      fixedValues,
      templateFileName: uploadedFile?.name,
      templateFileBuffer: uploadedFile?.buffer,
    })
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-card p-0 shadow-sm overflow-hidden">
      <header className="px-6 pt-6">
        <div className="flex items-center gap-4">
          <SettingsIconBadge accent="blue" className="h-10 w-10" icon={FileSpreadsheet} />
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">발주서 템플릿</h2>
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
                <input
                  accept=".xlsx"
                  className="hidden"
                  onChange={handleTemplateUpload}
                  ref={fileInputRef}
                  type="file"
                />
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 transition-colors hover:bg-accent/40">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {uploadedFile?.name || draft.templateFileName || '공통 템플릿 파일 선택...'}
                  </span>
                </div>
              </label>
              {(isAnalyzingUpload || isFetchingStoredAnalysis) && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
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
          <Button disabled={isSaving || !canSave || !isDirty} onClick={handleSave} size="sm" type="button">
            저장
          </Button>
          <Button disabled={isSaving || !isDirty} onClick={handleCancel} size="sm" type="button" variant="outline">
            취소
          </Button>
        </div>

        <CommonOrderTemplateColumnEditor
          fieldOptions={FIELD_OPTIONS}
          headers={effectiveAnalysis?.headers ?? []}
          lastUsedColumnIndex={effectiveAnalysis?.lastUsedColumnIndex}
          onApplySuggestions={applySuggestions}
          onChange={setColumnRules}
          sampleData={effectiveAnalysis?.sampleData ?? []}
          suggestionsCount={Object.keys(effectiveAnalysis?.suggestedMappings ?? {}).length}
          tokens={TEMPLATE_TOKENS}
          value={columnRules}
        />

        <TestDownloadSection />
      </div>
    </section>
  )
}

function parseInitialColumnRules(template: CommonOrderTemplate): Record<string, CommonTemplateColumnRule> {
  const columnRules: Record<string, CommonTemplateColumnRule> = {}

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

    if (/^[A-Z]+$/.test(normalized)) {
      columnRules[normalized] = { kind: 'template', template: value }
      continue
    }
  }

  return columnRules
}

function serializeColumnRules(columnRules: Record<string, CommonTemplateColumnRule>): string {
  const keys = Object.keys(columnRules).sort((a, b) => a.localeCompare(b))
  return JSON.stringify(
    keys.map((key) => {
      const rule = columnRules[key]
      if (!rule || rule.kind === 'none') {
        return [key, 'none']
      }
      if (rule.kind === 'field') {
        return [key, 'field', rule.fieldKey.trim()]
      }
      return [key, 'template', rule.template.trim()]
    }),
  )
}

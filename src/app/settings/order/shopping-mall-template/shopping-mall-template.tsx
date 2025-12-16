'use client'

import { FileSpreadsheet, Loader2, Plus, Store, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import type {
  ShoppingMallExportConfig,
  ShoppingMallTemplate as ShoppingMallTemplateType,
} from '@/services/shopping-mall-templates'

import { SABANGNET_COLUMNS } from '@/common/constants'
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
import { useServerAction } from '@/hooks/use-server-action'
import { useShoppingMallTemplates } from '@/hooks/use-settings'

import {
  addShoppingMallTemplate,
  type AnalyzeResult,
  analyzeShoppingMallFile,
  removeShoppingMallTemplate,
  updateShoppingMallTemplate,
} from './action'
import { ColumnMappingEditor } from './column-mapping-editor'
import { ExportMappingEditor } from './export-mapping-editor'
import { FixedValuesEditor } from './fixed-values-editor'
import { TemplateItem } from './template-item'

const REQUIRED_FIELDS = SABANGNET_COLUMNS.filter((col) => col.required).map((col) => col.key)

const SKELETON_TEMPLATE: ShoppingMallTemplateType = {
  id: 0,
  mallName: 'sample_mall',
  displayName: '쇼핑몰 이름',
  headerRow: 1,
  dataStartRow: 2,
  columnMappings: {
    주문번호: 'sabangnetOrderNumber',
    수취인명: 'recipientName',
    연락처: 'recipientPhone',
  },
  fixedValues: {},
  exportConfig: null,
  enabled: true,
  createdAt: '',
  updatedAt: '',
}

interface ModalState {
  analyzeResult: AnalyzeResult | null
  columnMappings: Record<string, string>
  exportConfig: ShoppingMallExportConfig | null
  file: File | null
  fileName: string | null
  fixedValues: Record<string, string>
  pendingSave: PendingSave | null
  templateId: number
}

interface PendingSave {
  dataStartRow: number
  displayName: string
  headerRow: number
  mallName: string
}

export function ShoppingMallTemplate() {
  const [isAnalyzing, analyze] = useServerAction(analyzeShoppingMallFile, {
    onSuccess: (result) => {
      setModalState((prev) => {
        if (!prev) return null
        return {
          ...prev,
          analyzeResult: result,
          columnMappings: shouldResetMappings.current ? {} : prev.columnMappings,
        }
      })
      shouldResetMappings.current = false
    },
  })

  const [isCreating, addTemplate] = useServerAction(addShoppingMallTemplate, {
    invalidateKeys: [queryKeys.shoppingMallTemplates.all],
    onSuccess: () => {
      toast.success('쇼핑몰 템플릿이 생성됐어요')
      setModalState(null)
    },
  })

  const [isUpdating, updateTemplate] = useServerAction(updateShoppingMallTemplate, {
    invalidateKeys: [queryKeys.shoppingMallTemplates.all],
    onSuccess: () => {
      toast.success('쇼핑몰 템플릿이 수정됐어요')
      setModalState(null)
    },
  })

  const [isRemoving, removeTemplate] = useServerAction(removeShoppingMallTemplate, {
    invalidateKeys: [queryKeys.shoppingMallTemplates.all],
    onSuccess: () => toast.info('쇼핑몰 템플릿이 삭제됐어요'),
  })

  const { data: templates = [], isLoading } = useShoppingMallTemplates()
  const [modalState, setModalState] = useState<ModalState | null>(null)
  const shouldResetMappings = useRef(false)
  const isNewTemplate = modalState?.templateId === 0
  const isSaving = isCreating || isUpdating

  function openNewTemplate() {
    setModalState({
      templateId: 0,
      columnMappings: {},
      fixedValues: {},
      exportConfig: null,
      analyzeResult: null,
      file: null,
      fileName: null,
      pendingSave: null,
    })
  }

  function openEditTemplate(template: ShoppingMallTemplateType) {
    setModalState({
      templateId: template.id,
      columnMappings: { ...template.columnMappings },
      fixedValues: { ...(template.fixedValues ?? {}) },
      exportConfig: template.exportConfig ?? null,
      analyzeResult: {
        detectedHeaderRow: template.headerRow,
        headers: Object.keys(template.columnMappings),
        columns: [],
        previewRows: [],
        totalRows: 0,
      },
      file: null,
      fileName: null,
      pendingSave: null,
    })
  }

  function closeModal() {
    setModalState(null)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]

    if (!file || !modalState) {
      return
    }

    setModalState((prev) => (prev ? { ...prev, file, fileName: file.name } : null))
    analyze({ file })
  }

  function handleHeaderRowBlur(e: React.FocusEvent<HTMLInputElement>) {
    const file = modalState?.file

    if (!file) {
      return
    }

    const headerRow = parseInt(e.target.value, 10) || 1
    shouldResetMappings.current = true
    analyze({ file, headerRow })
  }

  function handleHeaderRowChange(e: React.ChangeEvent<HTMLInputElement>) {
    const headerRow = parseInt(e.target.value, 10) || 1
    const form = e.currentTarget.form

    if (form) {
      const dataInput = form.elements.namedItem('data-start-row') as HTMLInputElement
      if (dataInput) {
        dataInput.value = String(headerRow + 1)
      }
    }
  }

  function getMissingRequiredFields(): string[] {
    if (!modalState) return []
    const satisfied = new Set(Object.values(modalState.columnMappings))
    for (const [fieldKey, rawValue] of Object.entries(modalState.fixedValues)) {
      if (rawValue.trim().length > 0) {
        satisfied.add(fieldKey)
      }
    }
    return REQUIRED_FIELDS.filter((field) => !satisfied.has(field))
  }

  function getDuplicateMappedFields(): string[] {
    if (!modalState) return []
    const counts = new Map<string, number>()
    for (const fieldKey of Object.values(modalState.columnMappings)) {
      counts.set(fieldKey, (counts.get(fieldKey) ?? 0) + 1)
    }
    for (const [fieldKey, rawValue] of Object.entries(modalState.fixedValues)) {
      if (rawValue.trim().length > 0) {
        counts.set(fieldKey, (counts.get(fieldKey) ?? 0) + 1)
      }
    }
    return [...counts.entries()].filter(([, count]) => count > 1).map(([fieldKey]) => fieldKey)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!modalState) {
      return
    }

    const data = new FormData(e.currentTarget)
    const mallName = String(data.get('mall-name') ?? '').trim()
    const displayName = String(data.get('display-name') ?? '').trim()
    const headerRow = parseInt(String(data.get('header-row') ?? ''), 10) || 1
    const dataStartRow = parseInt(String(data.get('data-start-row') ?? ''), 10) || headerRow + 1
    const duplicateFields = getDuplicateMappedFields()
    const missingFields = getMissingRequiredFields()

    if (duplicateFields.length > 0) {
      const labels = duplicateFields
        .map((f) => SABANGNET_COLUMNS.find((c) => c.key === f)?.label)
        .filter(Boolean)
        .join(', ')
      toast.error(labels ? `사방넷 필드가 중복으로 연결됐어요: ${labels}` : '사방넷 필드가 중복으로 연결됐어요')
      return
    }

    if (missingFields.length > 0) {
      setModalState((prev) =>
        prev ? { ...prev, pendingSave: { mallName, displayName, headerRow, dataStartRow } } : null,
      )
      return
    }

    const payload = {
      mallName,
      displayName,
      headerRow,
      dataStartRow,
      columnMappings: modalState.columnMappings,
      fixedValues: modalState.fixedValues,
      exportConfig: modalState.exportConfig ?? null,
    }

    if (isNewTemplate) {
      addTemplate(payload)
    } else {
      updateTemplate({ ...payload, id: modalState.templateId })
    }
  }

  function confirmSave() {
    if (!modalState?.pendingSave) {
      return
    }

    const { mallName, displayName, headerRow, dataStartRow } = modalState.pendingSave
    const duplicateFields = getDuplicateMappedFields()

    if (duplicateFields.length > 0) {
      const labels = duplicateFields
        .map((f) => SABANGNET_COLUMNS.find((c) => c.key === f)?.label)
        .filter(Boolean)
        .join(', ')
      toast.error(labels ? `사방넷 필드가 중복으로 연결됐어요: ${labels}` : '사방넷 필드가 중복으로 연결됐어요')
      return
    }

    const payload = {
      mallName,
      displayName,
      headerRow,
      dataStartRow,
      columnMappings: modalState.columnMappings,
      fixedValues: modalState.fixedValues,
      exportConfig: modalState.exportConfig ?? null,
    }

    if (isNewTemplate) {
      addTemplate(payload)
    } else {
      updateTemplate({ ...payload, id: modalState.templateId })
    }
  }

  function clearPendingSave() {
    setModalState((prev) => (prev ? { ...prev, pendingSave: null } : null))
  }

  const missingFields = getMissingRequiredFields()
  const duplicateFields = getDuplicateMappedFields()
  const hasDuplicateFields = duplicateFields.length > 0

  const missingLabels = missingFields
    .map((f) => SABANGNET_COLUMNS.find((c) => c.key === f)?.label)
    .filter(Boolean)
    .join(', ')

  const rowInputKey = modalState?.analyzeResult?.detectedHeaderRow ?? 0
  const mappedFieldKeys = useMemo(
    () => new Set(Object.values(modalState?.columnMappings ?? {})),
    [modalState?.columnMappings],
  )

  return (
    <>
      <section className="glass-card overflow-hidden p-0">
        <header className="px-6 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-violet-500/10 to-violet-600/5 ring-1 ring-violet-500/10">
                <Store className="h-5 w-5 text-violet-500" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">쇼핑몰 템플릿</h2>
                <p className="text-sm text-muted-foreground">쇼핑몰별 엑셀 파일 양식을 관리해요</p>
              </div>
            </div>
            <button
              className="glass-button inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium text-foreground"
              onClick={openNewTemplate}
              type="button"
            >
              <Plus className="h-4 w-4" />
              추가
            </button>
          </div>
        </header>
        <div className="space-y-5 p-6">
          <div className="space-y-2">
            {isLoading ? (
              <TemplateItem skeleton template={SKELETON_TEMPLATE} />
            ) : templates.length === 0 ? (
              <div className="glass-panel rounded-lg p-8 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-muted/50">
                  <Store className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-base font-medium text-foreground">템플릿 없음</p>
                <p className="mt-1 text-sm text-muted-foreground">추가 버튼을 눌러 시작하세요</p>
              </div>
            ) : (
              templates.map((template) => (
                <TemplateItem
                  isDeleting={isRemoving}
                  key={template.id}
                  onDelete={() => removeTemplate(template.id)}
                  onEdit={() => openEditTemplate(template)}
                  onToggle={() => updateTemplate({ id: template.id, enabled: !template.enabled })}
                  template={template}
                />
              ))
            )}
          </div>
          <div className="rounded-lg bg-muted/30 p-4 ring-1 ring-border/30">
            <p className="text-sm leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">쇼핑몰 템플릿</span>을 등록하면 해당 쇼핑몰에서 다운로드한
              주문 파일을 사방넷 양식으로 자동 변환할 수 있어요.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">샘플 파일을 업로드하면 컬럼 헤더를 자동으로 분석해요.</p>
          </div>
        </div>
      </section>

      <Dialog onOpenChange={(open) => !open && closeModal()} open={Boolean(modalState)}>
        <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
            <DialogHeader className="shrink-0 px-6 pb-4 pt-6">
              <DialogTitle className="text-lg font-semibold tracking-tight">
                {isNewTemplate ? '새 쇼핑몰 템플릿' : '템플릿 편집'}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                쇼핑몰 정보와 컬럼 연결을 설정해요
              </DialogDescription>
            </DialogHeader>

            {modalState && (
              <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium" htmlFor="mall-name">
                      쇼핑몰 ID (영문)
                    </Label>
                    <Input
                      defaultValue={
                        modalState.templateId !== 0
                          ? templates.find((t) => t.id === modalState.templateId)?.mallName
                          : ''
                      }
                      id="mall-name"
                      name="mall-name"
                      placeholder="sk_stoa"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium" htmlFor="display-name">
                      쇼핑몰명 (표시용)
                    </Label>
                    <Input
                      defaultValue={
                        modalState.templateId !== 0
                          ? templates.find((t) => t.id === modalState.templateId)?.displayName
                          : ''
                      }
                      id="display-name"
                      name="display-name"
                      placeholder="SK스토아"
                      required
                    />
                  </div>
                </div>

                {/* File Upload */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">샘플 파일 업로드</Label>
                  <label className="relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 transition-all hover:border-muted-foreground/50 hover:bg-muted/30">
                    <input
                      accept=".xlsx,.xls"
                      className="absolute inset-0 cursor-pointer opacity-0"
                      name="sample-file"
                      onChange={handleFileChange}
                      type="file"
                    />
                    {modalState.fileName ? (
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-8 w-8 text-emerald-500" />
                        <div>
                          <p className="font-medium text-foreground">{modalState.fileName}</p>
                          <p className="text-sm text-muted-foreground">클릭하여 다른 파일 선택</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <p className="mt-2 text-sm text-foreground">샘플 엑셀 파일을 업로드하세요</p>
                        <p className="text-xs text-muted-foreground">헤더를 자동으로 분석해요</p>
                      </>
                    )}
                  </label>
                </div>

                {/* Header/Data Row Config */}
                {modalState.analyzeResult && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium" htmlFor="header-row">
                        헤더 행 번호
                      </Label>
                      <Input
                        defaultValue={modalState.analyzeResult.detectedHeaderRow}
                        id="header-row"
                        key={`header-${rowInputKey}`}
                        min={1}
                        name="header-row"
                        onBlur={handleHeaderRowBlur}
                        onChange={handleHeaderRowChange}
                        type="number"
                      />
                      <p className="text-xs text-muted-foreground">
                        자동 감지: {modalState.analyzeResult.detectedHeaderRow}행
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium" htmlFor="data-start-row">
                        데이터 시작 행
                      </Label>
                      <Input
                        defaultValue={modalState.analyzeResult.detectedHeaderRow + 1}
                        id="data-start-row"
                        key={`data-${rowInputKey}`}
                        min={1}
                        name="data-start-row"
                        type="number"
                      />
                    </div>
                  </div>
                )}

                {/* Column Mappings */}
                {(modalState.analyzeResult || isAnalyzing) && (
                  <div className="space-y-2">
                    {isAnalyzing ? (
                      <div className="rounded-md ring-1 ring-border/50">
                        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>컬럼을 분석하고 있어요...</span>
                        </div>
                      </div>
                    ) : modalState.analyzeResult ? (
                      <ColumnMappingEditor
                        availableColumns={modalState.analyzeResult.columns}
                        fixedValues={modalState.fixedValues}
                        key={`mapping:${modalState.templateId}:${modalState.file?.lastModified ?? 'no-file'}:${modalState.file?.size ?? 0}:${modalState.analyzeResult.detectedHeaderRow}`}
                        missingRequiredLabels={missingFields.length > 0 ? missingLabels : undefined}
                        onChange={(next) =>
                          setModalState((prev) => {
                            if (!prev) return null
                            const fixedValues = { ...prev.fixedValues }
                            const usedFields = new Set(Object.values(next))
                            for (const fieldKey of Object.keys(fixedValues)) {
                              if (usedFields.has(fieldKey)) {
                                delete fixedValues[fieldKey]
                              }
                            }
                            return { ...prev, columnMappings: next, fixedValues }
                          })
                        }
                        previewRows={modalState.analyzeResult.previewRows}
                        value={modalState.columnMappings}
                      />
                    ) : (
                      <div className="rounded-md ring-1 ring-border/50">
                        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                          컬럼이 없어요
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <FixedValuesEditor
                  mappedFieldKeys={mappedFieldKeys}
                  onRemove={(fieldKey) =>
                    setModalState((prev) => {
                      if (!prev) return null
                      const nextFixed = { ...prev.fixedValues }
                      delete nextFixed[fieldKey]
                      return { ...prev, fixedValues: nextFixed }
                    })
                  }
                  onUpsert={(fieldKey, rawValue) =>
                    setModalState((prev) => {
                      if (!prev) return null
                      const trimmed = rawValue.trim()
                      const nextFixed = { ...prev.fixedValues }
                      if (trimmed.length === 0) {
                        delete nextFixed[fieldKey]
                      } else {
                        nextFixed[fieldKey] = trimmed
                      }

                      const nextMappings = { ...prev.columnMappings }
                      for (const [headerKey, mappedField] of Object.entries(nextMappings)) {
                        if (mappedField === fieldKey) {
                          delete nextMappings[headerKey]
                        }
                      }

                      return { ...prev, fixedValues: nextFixed, columnMappings: nextMappings }
                    })
                  }
                  value={modalState.fixedValues}
                />

                <ExportMappingEditor
                  availableColumns={modalState.analyzeResult?.columns ?? []}
                  onChange={(next) => setModalState((prev) => (prev ? { ...prev, exportConfig: next } : null))}
                  value={modalState.exportConfig}
                />
              </div>
            )}

            <DialogFooter className="shrink-0 border-t bg-muted/30 px-6 py-4">
              <div className="flex w-full gap-3">
                <Button className="flex-1" onClick={closeModal} type="button" variant="outline">
                  취소
                </Button>
                <Button
                  aria-disabled={isSaving || hasDuplicateFields}
                  className="flex-1 aria-disabled:opacity-50"
                  type="submit"
                >
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  저장
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog onOpenChange={(open) => !open && clearPendingSave()} open={Boolean(modalState?.pendingSave)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>필수 필드 미연결</AlertDialogTitle>
            <AlertDialogDescription>
              필수 필드가 연결되지 않았어요: {missingLabels}
              <br />
              그래도 저장할까요?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSave}>저장</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

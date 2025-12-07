'use client'

import { FileSpreadsheet, Loader2, Pencil, Plus, Store, Trash2, Upload } from 'lucide-react'
import { useState } from 'react'

import type { AnalyzeResult, ShoppingMallTemplate } from '@/services/shopping-mall-templates'

import { SABANGNET_COLUMNS } from '@/common/constants'
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
import { Badge } from '@/components/ui/badge'
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
import { cn } from '@/utils/cn'

const SABANGNET_FIELD_OPTIONS = SABANGNET_COLUMNS.map((col) => ({
  key: col.key,
  label: col.label,
  required: col.required,
}))

const REQUIRED_FIELDS = SABANGNET_COLUMNS.filter((col) => col.required).map((col) => col.key)

interface EditingTemplate {
  columnMappings: Record<string, string>
  dataStartRow: number
  displayName: string
  enabled: boolean
  headerRow: number
  id: string
  mallName: string
}

interface MappingRowProps {
  header: string
  onChange: (header: string, value: string) => void
  value: string
}

interface ShoppingMallTemplateProps {
  isDeleting?: boolean
  isSaving?: boolean
  onAnalyze: (file: File, headerRow?: number) => Promise<AnalyzeResult>
  onCreate: (data: {
    columnMappings: Record<string, string>
    dataStartRow: number
    displayName: string
    headerRow: number
    mallName: string
  }) => void
  onDelete: (id: string) => void
  onUpdate: (
    id: string,
    data: {
      columnMappings?: Record<string, string>
      dataStartRow?: number
      displayName?: string
      enabled?: boolean
      headerRow?: number
      mallName?: string
    },
  ) => void
  templates: ShoppingMallTemplate[]
}

export function ShoppingMallTemplate({
  templates,
  onUpdate,
  onCreate,
  onDelete,
  onAnalyze,
  isSaving = false,
  isDeleting = false,
}: ShoppingMallTemplateProps) {
  const [editingTemplate, setEditingTemplate] = useState<EditingTemplate | null>(null)
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showMissingFieldsWarning, setShowMissingFieldsWarning] = useState(false)
  const isModalOpen = editingTemplate !== null
  const isNewTemplate = editingTemplate?.id === ''

  function handleAddTemplate() {
    setEditingTemplate({
      id: '',
      mallName: '',
      displayName: '',
      headerRow: 1,
      dataStartRow: 2,
      columnMappings: {},
      enabled: true,
    })
    setAnalyzeResult(null)
    setSelectedFile(null)
    setAnalyzeError(null)
  }

  function handleEditTemplate(template: ShoppingMallTemplate) {
    setEditingTemplate({
      id: template.id,
      mallName: template.mallName,
      displayName: template.displayName,
      headerRow: template.headerRow,
      dataStartRow: template.dataStartRow,
      columnMappings: { ...template.columnMappings },
      enabled: template.enabled,
    })
    setAnalyzeResult({
      detectedHeaderRow: template.headerRow,
      headers: Object.keys(template.columnMappings),
      previewRows: [],
      totalRows: 0,
    })
    setSelectedFile(null)
    setAnalyzeError(null)
  }

  async function runAnalyze(file: File, headerRow?: number) {
    setIsAnalyzing(true)
    setAnalyzeError(null)

    try {
      const result = await onAnalyze(file, headerRow)
      setAnalyzeResult(result)
      return result
    } catch (error) {
      setAnalyzeError(error instanceof Error ? error.message : '파일 분석에 실패했습니다')
      return null
    } finally {
      setIsAnalyzing(false)
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]

    if (!file) {
      return
    }

    setSelectedFile(file)
    const result = await runAnalyze(file)

    if (result && editingTemplate) {
      setEditingTemplate({
        ...editingTemplate,
        headerRow: result.detectedHeaderRow,
        dataStartRow: result.detectedHeaderRow + 1,
      })
    }
  }

  function handleHeaderRowChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!editingTemplate) {
      return
    }

    const headerRow = parseInt(e.target.value, 10) || 1

    setEditingTemplate({
      ...editingTemplate,
      headerRow,
      dataStartRow: headerRow + 1,
    })
  }

  async function handleHeaderRowBlur() {
    if (!editingTemplate || !selectedFile) {
      return
    }

    await runAnalyze(selectedFile, editingTemplate.headerRow)
  }

  function handleMappingChange(header: string, sabangnetField: string) {
    if (!editingTemplate) {
      return
    }

    const newMappings = { ...editingTemplate.columnMappings }

    if (sabangnetField === '_none') {
      delete newMappings[header]
    } else {
      newMappings[header] = sabangnetField
    }

    setEditingTemplate({
      ...editingTemplate,
      columnMappings: newMappings,
    })
  }

  function getMissingRequiredFields() {
    if (!editingTemplate) {
      return []
    }

    const mappedFields = new Set(Object.values(editingTemplate.columnMappings))
    return REQUIRED_FIELDS.filter((field) => !mappedFields.has(field))
  }

  function handleSaveTemplate() {
    if (!editingTemplate || !editingTemplate.mallName || !editingTemplate.displayName) {
      return
    }

    const missingFields = getMissingRequiredFields()

    if (missingFields.length > 0) {
      setShowMissingFieldsWarning(true)
      return
    }

    confirmSave()
  }

  function confirmSave() {
    if (!editingTemplate) {
      return
    }

    if (isNewTemplate) {
      onCreate({
        mallName: editingTemplate.mallName,
        displayName: editingTemplate.displayName,
        headerRow: editingTemplate.headerRow,
        dataStartRow: editingTemplate.dataStartRow,
        columnMappings: editingTemplate.columnMappings,
      })
    } else {
      onUpdate(editingTemplate.id, editingTemplate)
    }

    setEditingTemplate(null)
    setAnalyzeResult(null)
    setSelectedFile(null)
    setShowMissingFieldsWarning(false)
  }

  return (
    <>
      <section className="glass-card p-0 overflow-hidden">
        <header className="px-6 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-violet-500/10 to-violet-600/5 ring-1 ring-violet-500/10">
                <Store className="h-5 w-5 text-violet-500" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">쇼핑몰 템플릿</h2>
                <p className="text-sm text-muted-foreground">쇼핑몰별 엑셀 파일 양식을 관리합니다</p>
              </div>
            </div>
            <button
              className="glass-button inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium text-foreground"
              onClick={handleAddTemplate}
            >
              <Plus className="h-4 w-4" />
              추가
            </button>
          </div>
        </header>
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                aria-disabled={!template.enabled}
                className="glass-panel rounded-lg p-4 py-3 flex items-center gap-4 transition aria-disabled:opacity-50"
                key={template.id}
              >
                <Switch
                  checked={template.enabled}
                  id={`template-${template.id}`}
                  onCheckedChange={() => onUpdate(template.id, { enabled: !template.enabled })}
                />
                <label className="flex-1 min-w-0 cursor-pointer" htmlFor={`template-${template.id}`}>
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="font-medium text-base text-foreground truncate">{template.displayName}</span>
                    <span className="inline-flex items-center rounded-md bg-secondary/80 px-2 py-0.5 text-xs font-mono font-medium text-secondary-foreground ring-1 ring-inset ring-secondary-foreground/10">
                      {template.mallName}
                    </span>
                    <Badge className="text-xs" variant="secondary">
                      {template.headerRow}행
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {Object.keys(template.columnMappings)
                      .slice(0, 4)
                      .map((col) => (
                        <span
                          className="inline-flex items-center rounded bg-muted/50 px-1.5 py-0.5 text-xs text-muted-foreground ring-1 ring-inset ring-border/50"
                          key={col}
                        >
                          {col}
                        </span>
                      ))}
                    {Object.keys(template.columnMappings).length > 4 && (
                      <span className="text-xs text-muted-foreground">
                        +{Object.keys(template.columnMappings).length - 4}개
                      </span>
                    )}
                  </div>
                </label>
                <div className="flex items-center gap-0.5">
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    onClick={() => handleEditTemplate(template)}
                    type="button"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                        disabled={isDeleting}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>쇼핑몰 템플릿 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                          정말 &ldquo;{template.displayName}&rdquo; 템플릿을 삭제하시겠습니까?
                          <br />이 작업은 되돌릴 수 없습니다.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-rose-600 hover:bg-rose-700"
                          onClick={() => onDelete(template.id)}
                        >
                          삭제
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
            {templates.length === 0 && (
              <div className="glass-panel rounded-lg p-8 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-muted/50">
                  <Store className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-base font-medium text-foreground">템플릿 없음</p>
                <p className="mt-1 text-sm text-muted-foreground">추가 버튼을 눌러 시작하세요</p>
              </div>
            )}
          </div>
          <div className="rounded-lg bg-muted/30 p-4 ring-1 ring-border/30">
            <p className="text-sm leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">쇼핑몰 템플릿</span>을 등록하면 해당 쇼핑몰에서 다운로드한
              주문 파일을 사방넷 양식으로 자동 변환할 수 있습니다.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              샘플 파일을 업로드하면 컬럼 헤더를 자동으로 분석합니다.
            </p>
          </div>
        </div>
      </section>
      <Dialog onOpenChange={(open) => !open && setEditingTemplate(null)} open={isModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85dvh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle className="text-lg font-semibold tracking-tight">
              {isNewTemplate ? '새 쇼핑몰 템플릿' : '템플릿 편집'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              쇼핑몰 정보와 컬럼 매핑을 설정합니다
            </DialogDescription>
          </DialogHeader>
          {editingTemplate && (
            <div className="px-6 py-4 space-y-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium" htmlFor="mall-name">
                    쇼핑몰 ID (영문)
                  </Label>
                  <Input
                    id="mall-name"
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, mallName: e.target.value })}
                    placeholder="sk_stoa"
                    required
                    value={editingTemplate.mallName}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium" htmlFor="display-name">
                    쇼핑몰명 (표시용)
                  </Label>
                  <Input
                    id="display-name"
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, displayName: e.target.value })}
                    placeholder="SK스토아"
                    required
                    value={editingTemplate.displayName}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">샘플 파일 업로드</Label>
                <div
                  className={cn(
                    'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-all',
                    'border-border hover:border-muted-foreground/50 hover:bg-muted/30',
                  )}
                >
                  <input
                    accept=".xlsx,.xls"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={handleFileSelect}
                    type="file"
                  />
                  {selectedFile ? (
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-8 w-8 text-emerald-500" />
                      <div>
                        <p className="font-medium text-foreground">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">클릭하여 다른 파일 선택</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <p className="mt-2 text-sm text-foreground">샘플 엑셀 파일을 업로드하세요</p>
                      <p className="text-xs text-muted-foreground">헤더를 자동으로 분석합니다</p>
                    </>
                  )}
                </div>
                {analyzeError && <p className="text-sm text-destructive">{analyzeError}</p>}
              </div>
              {analyzeResult && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium" htmlFor="header-row">
                      헤더 행 번호
                    </Label>
                    <Input
                      id="header-row"
                      min={1}
                      onBlur={handleHeaderRowBlur}
                      onChange={handleHeaderRowChange}
                      type="number"
                      value={editingTemplate.headerRow}
                    />
                    <p className="text-xs text-muted-foreground">자동 감지: {analyzeResult.detectedHeaderRow}행</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium" htmlFor="data-start-row">
                      데이터 시작 행
                    </Label>
                    <Input
                      id="data-start-row"
                      min={1}
                      onChange={(e) =>
                        setEditingTemplate({ ...editingTemplate, dataStartRow: parseInt(e.target.value, 10) || 2 })
                      }
                      type="number"
                      value={editingTemplate.dataStartRow}
                    />
                  </div>
                </div>
              )}
              {(analyzeResult || isAnalyzing) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">컬럼 매핑</Label>
                    {!isAnalyzing && getMissingRequiredFields().length > 0 && (
                      <span className="text-xs text-amber-500">
                        필수 필드 미매핑:{' '}
                        {getMissingRequiredFields()
                          .map((f) => SABANGNET_COLUMNS.find((c) => c.key === f)?.label)
                          .join(', ')}
                      </span>
                    )}
                  </div>
                  <div className="rounded-lg ring-1 ring-border/50 overflow-hidden max-h-52 overflow-y-auto">
                    {isAnalyzing ? (
                      <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>컬럼 분석 중...</span>
                      </div>
                    ) : analyzeResult && analyzeResult.headers.length > 0 ? (
                      <div className="divide-y divide-border/50">
                        {analyzeResult.headers.map((header) => (
                          <MappingRow
                            header={header}
                            key={header}
                            onChange={handleMappingChange}
                            value={editingTemplate.columnMappings[header] || '_none'}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                        컬럼이 없습니다
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="px-6 py-4 bg-muted/30 border-t shrink-0">
            <div className="flex w-full gap-3">
              <Button className="flex-1" onClick={() => setEditingTemplate(null)} variant="outline">
                취소
              </Button>
              <Button
                className="flex-1"
                disabled={!editingTemplate?.mallName || !editingTemplate?.displayName || isSaving}
                onClick={handleSaveTemplate}
              >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : '저장'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog onOpenChange={setShowMissingFieldsWarning} open={showMissingFieldsWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>필수 필드 미매핑</AlertDialogTitle>
            <AlertDialogDescription>
              필수 필드가 매핑되지 않았습니다:{' '}
              {getMissingRequiredFields()
                .map((f) => SABANGNET_COLUMNS.find((c) => c.key === f)?.label)
                .filter(Boolean)
                .join(', ')}
              <br />
              그래도 저장하시겠습니까?
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

function MappingRow({ header, value, onChange }: MappingRowProps) {
  return (
    <div className="flex items-center gap-4 px-3 py-2 bg-muted/20">
      <span className="flex-1 text-sm font-medium text-foreground truncate">{header}</span>
      <Select onValueChange={(v) => onChange(header, v)} value={value}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="선택하세요" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_none">
            <span className="text-muted-foreground">매핑 안함</span>
          </SelectItem>
          {SABANGNET_FIELD_OPTIONS.map((field) => (
            <SelectItem key={field.key} value={field.key}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

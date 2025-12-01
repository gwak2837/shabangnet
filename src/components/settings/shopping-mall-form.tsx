'use client'

import { CheckCircle2, FileSpreadsheet, Loader2, Pencil, Plus, Store, Trash2, Upload } from 'lucide-react'
import { useCallback, useState } from 'react'

import type { AnalyzeResult, ShoppingMallTemplate } from '@/services/db/shopping-mall-templates'

import { SABANGNET_COLUMNS } from '@/common/constants'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/utils/cn'

// 사방넷 필드 옵션 (필수 필드 표시)
const SABANGNET_FIELD_OPTIONS = SABANGNET_COLUMNS.map((col) => ({
  key: col.key,
  label: col.label,
  required: col.required,
}))

// 필수 필드 목록
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

interface ShoppingMallFormProps {
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

export function ShoppingMallForm({
  templates,
  onUpdate,
  onCreate,
  onDelete,
  onAnalyze,
  isSaving = false,
  isDeleting = false,
}: ShoppingMallFormProps) {
  const [saved, setSaved] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isNewTemplate, setIsNewTemplate] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EditingTemplate | null>(null)

  // 파일 분석 상태
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const createEmptyTemplate = (): EditingTemplate => ({
    id: '',
    mallName: '',
    displayName: '',
    headerRow: 1,
    dataStartRow: 2,
    columnMappings: {},
    enabled: true,
  })

  const handleAddTemplate = () => {
    setEditingTemplate(createEmptyTemplate())
    setIsNewTemplate(true)
    setAnalyzeResult(null)
    setSelectedFile(null)
    setAnalyzeError(null)
    setIsModalOpen(true)
  }

  const handleEditTemplate = (template: ShoppingMallTemplate) => {
    setEditingTemplate({
      id: template.id,
      mallName: template.mallName,
      displayName: template.displayName,
      headerRow: template.headerRow,
      dataStartRow: template.dataStartRow,
      columnMappings: { ...template.columnMappings },
      enabled: template.enabled,
    })
    setIsNewTemplate(false)
    // 편집 시 기존 매핑 헤더를 analyzeResult에 설정
    setAnalyzeResult({
      detectedHeaderRow: template.headerRow,
      headers: Object.keys(template.columnMappings),
      previewRows: [],
      totalRows: 0,
    })
    setSelectedFile(null)
    setAnalyzeError(null)
    setIsModalOpen(true)
  }

  const handleDeleteTemplate = (id: string) => {
    if (confirm('정말 이 쇼핑몰 템플릿을 삭제하시겠습니까?')) {
      onDelete(id)
    }
  }

  const handleToggleEnabled = (id: string, currentEnabled: boolean) => {
    onUpdate(id, { enabled: !currentEnabled })
  }

  // 파일 분석
  const handleFileSelect = useCallback(
    async (file: File) => {
      setSelectedFile(file)
      setIsAnalyzing(true)
      setAnalyzeError(null)

      try {
        const result = await onAnalyze(file)
        setAnalyzeResult(result)

        // 헤더 행과 데이터 시작 행 자동 설정
        if (editingTemplate) {
          setEditingTemplate({
            ...editingTemplate,
            headerRow: result.detectedHeaderRow,
            dataStartRow: result.detectedHeaderRow + 1,
          })
        }
      } catch (error) {
        setAnalyzeError(error instanceof Error ? error.message : '파일 분석에 실패했습니다')
      } finally {
        setIsAnalyzing(false)
      }
    },
    [editingTemplate, onAnalyze],
  )

  // 헤더 행 변경 시 재분석
  const handleHeaderRowChange = useCallback(
    async (headerRow: number) => {
      if (!editingTemplate) return

      setEditingTemplate({
        ...editingTemplate,
        headerRow,
        dataStartRow: headerRow + 1,
      })

      if (selectedFile) {
        setIsAnalyzing(true)
        try {
          const result = await onAnalyze(selectedFile, headerRow)
          setAnalyzeResult(result)
        } catch (error) {
          setAnalyzeError(error instanceof Error ? error.message : '파일 분석에 실패했습니다')
        } finally {
          setIsAnalyzing(false)
        }
      }
    },
    [editingTemplate, selectedFile, onAnalyze],
  )

  // 컬럼 매핑 변경
  const handleMappingChange = (header: string, sabangnetField: string) => {
    if (!editingTemplate) return

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

  // 필수 필드 매핑 확인
  const getMissingRequiredFields = () => {
    if (!editingTemplate) return []

    const mappedFields = new Set(Object.values(editingTemplate.columnMappings))
    return REQUIRED_FIELDS.filter((field) => !mappedFields.has(field))
  }

  const handleSaveTemplate = () => {
    if (!editingTemplate || !editingTemplate.mallName || !editingTemplate.displayName) return

    const missingFields = getMissingRequiredFields()
    if (missingFields.length > 0) {
      const fieldNames = missingFields
        .map((f) => SABANGNET_COLUMNS.find((c) => c.key === f)?.label)
        .filter(Boolean)
        .join(', ')
      if (!confirm(`필수 필드가 매핑되지 않았습니다: ${fieldNames}\n그래도 저장하시겠습니까?`)) {
        return
      }
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

    setIsModalOpen(false)
    setEditingTemplate(null)
    setAnalyzeResult(null)
    setSelectedFile(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <>
      <Card className="border-slate-200 bg-card shadow-sm py-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
                <Store className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <CardTitle className="text-lg">쇼핑몰 템플릿</CardTitle>
                <CardDescription>쇼핑몰별 엑셀 파일 양식을 관리합니다</CardDescription>
              </div>
            </div>
            <Button className="gap-2" onClick={handleAddTemplate} size="sm" variant="outline">
              <Plus className="h-4 w-4" />
              템플릿 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Template List Table */}
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12">활성</TableHead>
                  <TableHead>쇼핑몰명</TableHead>
                  <TableHead className="w-24">헤더 행</TableHead>
                  <TableHead>매핑된 컬럼</TableHead>
                  <TableHead className="w-24 text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-center text-slate-500 py-8" colSpan={5}>
                      등록된 쇼핑몰 템플릿이 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  templates.map((template) => (
                    <TableRow className={!template.enabled ? 'opacity-50' : ''} key={template.id}>
                      <TableCell>
                        <Switch
                          checked={template.enabled}
                          className="data-[state=checked]:bg-emerald-500"
                          onCheckedChange={() => handleToggleEnabled(template.id, template.enabled)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>
                          {template.displayName}
                          <span className="ml-2 text-xs text-slate-400">({template.mallName})</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="font-mono" variant="secondary">
                          {template.headerRow}행
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {Object.keys(template.columnMappings)
                            .slice(0, 4)
                            .map((col) => (
                              <Badge className="text-xs" key={col} variant="outline">
                                {col}
                              </Badge>
                            ))}
                          {Object.keys(template.columnMappings).length > 4 && (
                            <Badge className="text-xs text-slate-500" variant="outline">
                              +{Object.keys(template.columnMappings).length - 4}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            className="h-8 w-8 p-0"
                            onClick={() => handleEditTemplate(template)}
                            size="sm"
                            variant="ghost"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            disabled={isDeleting}
                            onClick={() => handleDeleteTemplate(template.id)}
                            size="sm"
                            variant="ghost"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Info */}
          <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
            <p>
              <strong>쇼핑몰 템플릿</strong>을 등록하면 해당 쇼핑몰에서 다운로드한 주문 파일을 사방넷 양식으로 자동
              변환할 수 있습니다.
            </p>
            <p className="mt-1">샘플 파일을 업로드하면 컬럼 헤더를 자동으로 분석합니다.</p>
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNewTemplate ? '쇼핑몰 템플릿 추가' : '쇼핑몰 템플릿 수정'}</DialogTitle>
            <DialogDescription>쇼핑몰 정보와 컬럼 매핑을 설정하세요</DialogDescription>
          </DialogHeader>

          {editingTemplate && (
            <div className="space-y-6 py-4">
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mallName">쇼핑몰 ID (영문)</Label>
                  <Input
                    id="mallName"
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, mallName: e.target.value })}
                    placeholder="sk_stoa"
                    value={editingTemplate.mallName}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">쇼핑몰명 (표시용)</Label>
                  <Input
                    id="displayName"
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, displayName: e.target.value })}
                    placeholder="SK스토아"
                    value={editingTemplate.displayName}
                  />
                </div>
              </div>

              {/* 샘플 파일 업로드 */}
              <div className="space-y-2">
                <Label>샘플 파일 업로드</Label>
                <div
                  className={cn(
                    'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-all',
                    'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                  )}
                >
                  <input
                    accept=".xlsx,.xls"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileSelect(file)
                    }}
                    type="file"
                  />

                  {isAnalyzing ? (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>파일 분석 중...</span>
                    </div>
                  ) : selectedFile ? (
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-8 w-8 text-emerald-600" />
                      <div>
                        <p className="font-medium text-slate-900">{selectedFile.name}</p>
                        <p className="text-sm text-slate-500">클릭하여 다른 파일 선택</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-slate-400" />
                      <p className="mt-2 text-sm text-slate-600">샘플 엑셀 파일을 업로드하세요</p>
                      <p className="text-xs text-slate-400">헤더를 자동으로 분석합니다</p>
                    </>
                  )}
                </div>
                {analyzeError && <p className="text-sm text-rose-600">{analyzeError}</p>}
              </div>

              {/* 헤더 행 설정 */}
              {analyzeResult && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="headerRow">헤더 행 번호</Label>
                    <Input
                      id="headerRow"
                      min={1}
                      onChange={(e) => handleHeaderRowChange(parseInt(e.target.value, 10) || 1)}
                      type="number"
                      value={editingTemplate.headerRow}
                    />
                    <p className="text-xs text-slate-500">자동 감지: {analyzeResult.detectedHeaderRow}행</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dataStartRow">데이터 시작 행</Label>
                    <Input
                      id="dataStartRow"
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

              {/* 컬럼 매핑 */}
              {analyzeResult && analyzeResult.headers.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>컬럼 매핑</Label>
                    {getMissingRequiredFields().length > 0 && (
                      <span className="text-xs text-amber-600">
                        필수 필드 미매핑:{' '}
                        {getMissingRequiredFields()
                          .map((f) => SABANGNET_COLUMNS.find((c) => c.key === f)?.label)
                          .join(', ')}
                      </span>
                    )}
                  </div>
                  <div className="rounded-lg border border-slate-200 overflow-hidden max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead>쇼핑몰 컬럼</TableHead>
                          <TableHead>사방넷 필드</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analyzeResult.headers.map((header) => (
                          <TableRow key={header}>
                            <TableCell className="font-medium">{header}</TableCell>
                            <TableCell>
                              <Select
                                onValueChange={(value) => handleMappingChange(header, value)}
                                value={editingTemplate.columnMappings[header] || '_none'}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="선택하세요" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="_none">
                                    <span className="text-slate-400">매핑 안함</span>
                                  </SelectItem>
                                  {SABANGNET_FIELD_OPTIONS.map((field) => (
                                    <SelectItem key={field.key} value={field.key}>
                                      {field.label}
                                      {field.required && <span className="text-rose-500 ml-1">*</span>}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* 활성화 스위치 */}
              {!isNewTemplate && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingTemplate.enabled}
                    id="templateEnabled"
                    onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, enabled: checked })}
                  />
                  <Label htmlFor="templateEnabled">활성화</Label>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsModalOpen(false)} variant="outline">
              취소
            </Button>
            <Button
              className="bg-slate-900 hover:bg-slate-800"
              disabled={!editingTemplate?.mallName || !editingTemplate?.displayName || isSaving}
              onClick={handleSaveTemplate}
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

'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Upload, FileSpreadsheet, X, Truck } from 'lucide-react'
import { formatFileSize } from '@/lib/mock-data'

interface InvoiceDropzoneProps {
  onFileSelect: (file: File) => void
  selectedFile: File | null
  onClear: () => void
  isProcessing: boolean
  disabled?: boolean
}

export function InvoiceDropzone({
  onFileSelect,
  selectedFile,
  onClear,
  isProcessing,
  disabled = false,
}: InvoiceDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled) setIsDragging(true)
    },
    [disabled],
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      if (disabled) return

      const file = e.dataTransfer.files[0]
      if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
        onFileSelect(file)
      }
    },
    [onFileSelect, disabled],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        onFileSelect(file)
      }
    },
    [onFileSelect],
  )

  return (
    <Card className={cn('border-slate-200 bg-white shadow-sm', disabled && 'opacity-60')}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
            <Truck className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-lg">송장 파일 업로드</CardTitle>
            <CardDescription>거래처에서 받은 송장 파일을 업로드하세요</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {selectedFile ? (
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                  <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{selectedFile.name}</p>
                  <p className="text-sm text-slate-500">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              {!isProcessing && (
                <Button variant="ghost" size="icon" onClick={onClear} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>

            {isProcessing && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">파일 분석 중...</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-amber-500 animate-pulse" style={{ width: '60%' }} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            className={cn(
              'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-all',
              disabled
                ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
                : isDragging
                  ? 'border-amber-400 bg-amber-50'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {!disabled && (
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileInput}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            )}

            <div
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-2xl transition-colors',
                disabled ? 'bg-slate-100' : isDragging ? 'bg-amber-100' : 'bg-slate-100',
              )}
            >
              <Upload
                className={cn(
                  'h-7 w-7 transition-colors',
                  disabled ? 'text-slate-300' : isDragging ? 'text-amber-600' : 'text-slate-400',
                )}
              />
            </div>

            <p className={cn('mt-4 text-base font-semibold', disabled ? 'text-slate-400' : 'text-slate-900')}>
              {disabled ? '먼저 발주 이력을 선택하세요' : '파일을 드래그하거나 클릭하여 업로드'}
            </p>
            <p className="mt-1 text-sm text-slate-500">거래처에서 받은 송장 파일 (.xlsx, .xls)</p>

            {!disabled && (
              <div className="mt-4 flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium text-slate-600">.xlsx</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium text-slate-600">.xls</span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

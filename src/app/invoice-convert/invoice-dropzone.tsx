'use client'

import { FileSpreadsheet, Truck, Upload, X } from 'lucide-react'
import { useCallback, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/utils/cn'
import { formatFileSize } from '@/utils/format/number'

interface InvoiceDropzoneProps {
  disabled?: boolean
  isProcessing: boolean
  onClear: () => void
  onFileSelect: (file: File) => void
  selectedFile: File | null
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
    <Card aria-disabled={disabled} className="border-slate-200 bg-card shadow-sm py-6 aria-disabled:opacity-60">
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
                <Button className="text-slate-400 hover:text-slate-600" onClick={onClear} size="icon" variant="ghost">
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
            aria-disabled={disabled}
            className="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-all aria-disabled:border-slate-200 aria-disabled:bg-slate-50 aria-disabled:cursor-not-allowed data-[dragging=true]:border-amber-400 data-[dragging=true]:bg-amber-50 data-[dragging=false]:border-slate-200 data-[dragging=false]:hover:border-slate-300 data-[dragging=false]:hover:bg-slate-50"
            data-dragging={isDragging}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {!disabled && (
              <input
                accept=".xlsx,.xls"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={handleFileInput}
                type="file"
              />
            )}

            <div
              aria-disabled={disabled}
              className="flex h-14 w-14 items-center justify-center rounded-2xl transition-colors aria-disabled:bg-slate-100 data-[dragging=true]:bg-amber-100 data-[dragging=false]:bg-slate-100"
              data-dragging={isDragging}
            >
              <Upload
                aria-disabled={disabled}
                className="h-7 w-7 transition-colors aria-disabled:text-slate-300 data-[dragging=true]:text-amber-600 data-[dragging=false]:text-slate-400"
                data-dragging={isDragging}
              />
            </div>

            <p
              aria-disabled={disabled}
              className="mt-4 text-base font-semibold aria-disabled:text-slate-400 data-[enabled=true]:text-slate-900"
              data-enabled={!disabled}
            >
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

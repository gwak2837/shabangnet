'use client'

import { FileSpreadsheet, Loader2, Upload, X } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatFileSize } from '@/utils/format/number'

interface DropzoneProps {
  acceptedExtensions: string[]
  disabled?: boolean
  isProcessing: boolean
  onClear: () => void
  onError: (message: string) => void
  onFileSelect: (file: File) => void
  selectedFile: File | null
}

export function Dropzone({
  acceptedExtensions,
  disabled,
  isProcessing,
  onClear,
  onError,
  onFileSelect,
  selectedFile,
}: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  function validateAndSelect(file: File) {
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (!acceptedExtensions.includes(ext)) {
      onError('파일 형식이 올바르지 않아요')
      return
    }
    onFileSelect(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)

    if (disabled) {
      return
    }

    const file = e.dataTransfer.files[0]
    validateAndSelect(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (disabled) {
      return
    }

    const file = e.target.files?.[0]

    if (!file) {
      return
    }

    validateAndSelect(file)
  }

  if (selectedFile) {
    return (
      <Card className="border-slate-200 bg-card shadow-sm">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50">
                <FileSpreadsheet className="h-7 w-7 text-emerald-600" />
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
            <div className="mt-6">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                <span className="font-medium">파일을 분석하고 있어요</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">파일 크기에 따라 최대 1분 정도 걸릴 수 있어요.</p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card aria-disabled={disabled} className="border-slate-200 bg-card shadow-sm aria-disabled:opacity-60">
      <CardContent className="p-4">
        <div
          aria-disabled={disabled}
          className="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-all border-slate-200 hover:border-slate-300 hover:bg-slate-50 aria-disabled:bg-slate-50 aria-disabled:cursor-not-allowed aria-disabled:hover:border-slate-200 aria-disabled:hover:bg-slate-50 data-dragging:border-blue-400 data-dragging:bg-blue-50"
          data-dragging={isDragging || undefined}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            accept={acceptedExtensions.join(',')}
            aria-disabled={disabled}
            className="absolute inset-0 opacity-0 cursor-pointer aria-disabled:cursor-not-allowed"
            disabled={disabled}
            onChange={handleFileInput}
            type="file"
          />
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl transition-colors bg-slate-100 data-dragging:bg-blue-100"
            data-dragging={isDragging || undefined}
          >
            <Upload
              className="h-8 w-8 transition-colors text-slate-400 data-dragging:text-blue-600"
              data-dragging={isDragging || undefined}
            />
          </div>
          <p className="mt-4 text-lg font-semibold text-slate-900">파일을 드래그하거나 클릭하여 업로드</p>
          <p className="mt-1 text-sm text-slate-500">사방넷에서 다운로드한 주문 엑셀 파일을 업로드하세요</p>
          <div className="mt-6 flex items-center gap-3">
            {acceptedExtensions.map((ext) => (
              <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5" key={ext}>
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-slate-600">{ext}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

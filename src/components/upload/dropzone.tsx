'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Upload, FileSpreadsheet, X } from 'lucide-react'
import { formatFileSize } from '@/lib/mock-data'

interface DropzoneProps {
  onFileSelect: (file: File) => void
  selectedFile: File | null
  onClear: () => void
  isProcessing: boolean
}

export function Dropzone({ onFileSelect, selectedFile, onClear, isProcessing }: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
        onFileSelect(file)
      }
    },
    [onFileSelect],
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

  if (selectedFile) {
    return (
      <Card className="border-slate-200 bg-white shadow-sm">
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
              <Button variant="ghost" size="icon" onClick={onClear} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>

          {isProcessing && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">파일 처리 중...</span>
                <span className="text-sm text-slate-500">75%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: '75%' }} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="p-0">
        <div
          className={cn(
            'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-all',
            isDragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileInput}
            className="absolute inset-0 cursor-pointer opacity-0"
          />

          <div
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-2xl transition-colors',
              isDragging ? 'bg-blue-100' : 'bg-slate-100',
            )}
          >
            <Upload className={cn('h-8 w-8 transition-colors', isDragging ? 'text-blue-600' : 'text-slate-400')} />
          </div>

          <p className="mt-4 text-lg font-semibold text-slate-900">파일을 드래그하거나 클릭하여 업로드</p>
          <p className="mt-1 text-sm text-slate-500">사방넷에서 다운로드한 주문 엑셀 파일을 업로드하세요</p>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-slate-600">.xlsx</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-slate-600">.xls</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

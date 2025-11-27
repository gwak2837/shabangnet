'use client'

import { AppShell } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Dropzone, UploadResult } from '@/components/upload'
import { useState } from 'react'

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isProcessed, setIsProcessed] = useState(false)

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setIsProcessing(true)
    setIsProcessed(false)

    // Simulate file processing
    setTimeout(() => {
      setIsProcessing(false)
      setIsProcessed(true)
    }, 2000)
  }

  const handleClear = () => {
    setSelectedFile(null)
    setIsProcessing(false)
    setIsProcessed(false)
  }

  return (
    <AppShell title="주문 업로드" description="사방넷에서 다운로드한 주문 엑셀 파일을 업로드하세요">
      {/* Dropzone */}
      <div className="max-w-2xl mx-auto">
        <Dropzone
          onFileSelect={handleFileSelect}
          selectedFile={selectedFile}
          onClear={handleClear}
          isProcessing={isProcessing}
        />

        {/* Processing indicator */}
        {isProcessing && (
          <div className="mt-4 flex items-center justify-center">
            <div className="flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <span className="text-sm font-medium text-blue-700">파일을 분석하고 있습니다...</span>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {isProcessed && selectedFile && (
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">업로드 결과</h2>
            <Button variant="outline" size="sm" onClick={handleClear} className="text-slate-600">
              새 파일 업로드
            </Button>
          </div>
          <UploadResult fileName={selectedFile.name} />
        </div>
      )}
    </AppShell>
  )
}

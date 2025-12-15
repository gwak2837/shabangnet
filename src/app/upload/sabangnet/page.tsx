'use client'

import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'

import { Dropzone } from '@/app/upload/dropzone'
import { UploadResult } from '@/app/upload/upload-result'
import { queryKeys } from '@/common/constants/query-keys'
import { Button } from '@/components/ui/button'

import { UploadState } from '../common'

export default function SabangnetUploadPage() {
  const queryClient = useQueryClient()
  const [{ status, message, file, result }, setUploadState] = useState<UploadState>({ status: 'idle' })
  const isProcessing = status === 'processing'
  const selectedFile = status === 'processing' || status === 'success' ? file : null

  async function handleFileSelect(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    setUploadState({ status: 'processing', file })

    try {
      const response = await fetch('/api/upload/sabangnet', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '업로드 중 오류가 발생했어요')
      }

      setUploadState({ status: 'success', file, result: data })
      queryClient.invalidateQueries({ queryKey: queryKeys.uploads.all })
    } catch (err) {
      setUploadState({
        status: 'error',
        message: err instanceof Error ? err.message : '파일을 업로드하지 못했어요',
      })
    }
  }

  function handleClear() {
    setUploadState({ status: 'idle' })
  }

  return (
    <>
      <div className="max-w-2xl mx-auto">
        {status !== 'success' && (
          <Dropzone
            isProcessing={isProcessing}
            onClear={handleClear}
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
          />
        )}
        {isProcessing && (
          <div className="mt-4 flex items-center justify-center">
            <div className="flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <span className="text-sm font-medium text-blue-700">파일을 분석하고 있어요</span>
            </div>
          </div>
        )}
        {status === 'error' && (
          <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3">
            <p className="text-sm font-medium text-rose-700">{message}</p>
          </div>
        )}
      </div>
      {status === 'success' && (
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">업로드 결과</h2>
            <Button onClick={handleClear} variant="ghost">
              새 파일 업로드
            </Button>
          </div>
          <UploadResult data={result} />
          <div className="mt-5 flex items-center justify-end">
            <Button asChild>
              <Link href="/order">발주 생성</Link>
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import { useQueryClient } from '@tanstack/react-query'
import { Loader2, Store } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Dropzone } from '@/app/upload/dropzone'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useShoppingMallTemplates } from '@/hooks/use-settings'

import { invalidateCachesAfterUpload } from '../invalidate-after-upload'

const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls']

type PageState =
  | { status: 'error'; file?: undefined; message: string }
  | { status: 'idle'; file?: undefined; message?: undefined }
  | { status: 'processing'; file: File; message?: undefined }

export default function ShoppingMallUploadPage() {
  const queryClient = useQueryClient()
  const [selectedMall, setSelectedMall] = useState('')
  const [{ status, message, file }, setUploadState] = useState<PageState>({ status: 'idle' })
  const { data: shoppingMallTemplates, isLoading: isLoadingTemplates } = useShoppingMallTemplates()
  const enabledTemplates = shoppingMallTemplates?.filter((t) => t.enabled) ?? []
  const isProcessing = status === 'processing'
  const selectedFile = status === 'processing' ? file : null

  function handleError(message: string) {
    setUploadState({ status: 'error', message })
  }

  async function handleFileSelect(file: File) {
    if (!selectedMall) {
      setUploadState({ status: 'error', message: '쇼핑몰을 선택해주세요' })
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('mall-id', selectedMall)
    setUploadState({ status: 'processing', file })

    try {
      const response = await fetch('/api/upload/shopping-mall', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(data?.error || '업로드 중 오류가 발생했어요')
      }

      const blob = await response.blob()
      const disposition = response.headers.get('content-disposition')
      const fileNameFromHeader = disposition?.match(/filename="(?<name>.+?)"/i)?.groups?.name
      const fileName = fileNameFromHeader ? decodeURIComponent(fileNameFromHeader) : file.name

      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = fileName
      link.click()
      URL.revokeObjectURL(link.href)

      toast.success('다운로드가 시작됐어요')
      setUploadState({ status: 'idle' })
      await invalidateCachesAfterUpload(queryClient)
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
      <div className="max-w-2xl mx-auto mb-6">
        <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Store className="h-5 w-5 text-violet-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-violet-900">쇼핑몰 선택</p>
              <p className="text-sm text-violet-700 mt-1 mb-3">업로드한 파일을 선택한 쇼핑몰의 양식에 맞게 변환해요</p>
              <Select
                disabled={isProcessing || isLoadingTemplates || enabledTemplates.length === 0}
                onValueChange={setSelectedMall}
                value={selectedMall}
              >
                <SelectTrigger className="w-full bg-background">
                  {isLoadingTemplates ? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      로딩 중...
                    </span>
                  ) : enabledTemplates.length === 0 ? (
                    <span className="text-muted-foreground">등록된 쇼핑몰이 없습니다</span>
                  ) : (
                    <SelectValue placeholder="쇼핑몰을 선택하세요" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {enabledTemplates.map((mall) => (
                    <SelectItem key={mall.id} value={mall.id.toString()}>
                      {mall.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto">
        <Dropzone
          acceptedExtensions={ACCEPTED_EXTENSIONS}
          disabled={!selectedMall || enabledTemplates.length === 0}
          isProcessing={isProcessing}
          onClear={handleClear}
          onError={handleError}
          onFileSelect={handleFileSelect}
          selectedFile={selectedFile}
        />
        {status === 'error' && (
          <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3">
            <p className="text-sm font-medium text-rose-700">{message}</p>
          </div>
        )}
      </div>
    </>
  )
}

'use client'

import { useState } from 'react'
import { AppShell } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Dropzone, UploadResult } from '@/components/upload'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SHOPPING_MALL_CONFIGS } from '@/lib/constants'
import { FileSpreadsheet, Store } from 'lucide-react'

type UploadType = 'sabangnet' | 'shopping_mall'

interface UploadResultData {
  success: boolean
  uploadId: string
  fileName: string
  mallName?: string
  totalOrders: number
  processedOrders: number
  errorOrders: number
  manufacturerBreakdown: { name: string; orders: number; amount: number }[]
  errors: { row: number; message: string; productCode?: string; productName?: string }[]
}

export default function UploadPage() {
  const [uploadType, setUploadType] = useState<UploadType>('sabangnet')
  const [selectedMall, setSelectedMall] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResultData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file)
    setIsProcessing(true)
    setError(null)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      let apiUrl = '/api/upload/sabangnet'

      if (uploadType === 'shopping_mall') {
        if (!selectedMall) {
          throw new Error('쇼핑몰을 선택해주세요')
        }
        apiUrl = '/api/upload/shopping-mall'
        formData.append('mallId', selectedMall)
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '업로드 중 오류가 발생했습니다')
      }

      setUploadResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClear = () => {
    setSelectedFile(null)
    setIsProcessing(false)
    setUploadResult(null)
    setError(null)
  }

  const descriptions: Record<UploadType, string> = {
    sabangnet: '사방넷에서 다운로드한 주문 엑셀 파일을 업로드하세요',
    shopping_mall: '쇼핑몰에서 다운로드한 주문 파일을 사방넷 양식으로 변환합니다',
  }

  return (
    <AppShell title="주문 업로드" description={descriptions[uploadType]}>
      {/* Upload Type Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-slate-200">
        <button
          onClick={() => {
            setUploadType('sabangnet')
            handleClear()
          }}
          className={`relative px-4 py-3 text-sm font-medium transition-colors ${
            uploadType === 'sabangnet' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            사방넷 주문
          </div>
          {uploadType === 'sabangnet' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
        </button>
        <button
          onClick={() => {
            setUploadType('shopping_mall')
            handleClear()
          }}
          className={`relative px-4 py-3 text-sm font-medium transition-colors ${
            uploadType === 'shopping_mall' ? 'text-violet-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            쇼핑몰 주문
            <Badge variant="secondary" className="bg-violet-100 text-violet-700 text-xs">
              변환
            </Badge>
          </div>
          {uploadType === 'shopping_mall' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600" />}
        </button>
      </div>

      {/* Shopping Mall Selector */}
      {uploadType === 'shopping_mall' && !uploadResult && (
        <div className="max-w-2xl mx-auto mb-6">
          <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Store className="h-5 w-5 text-violet-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-violet-900">쇼핑몰 선택</p>
                <p className="text-sm text-violet-700 mt-1 mb-3">
                  업로드할 파일의 출처 쇼핑몰을 선택하세요. 선택한 쇼핑몰의 양식에 맞게 파일을 파싱합니다.
                </p>
                <Select value={selectedMall} onValueChange={setSelectedMall}>
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="쇼핑몰을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHOPPING_MALL_CONFIGS.map((mall) => (
                      <SelectItem key={mall.id} value={mall.id}>
                        {mall.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dropzone */}
      <div className="max-w-2xl mx-auto">
        {!uploadResult && (
          <Dropzone
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            onClear={handleClear}
            isProcessing={isProcessing}
            disabled={uploadType === 'shopping_mall' && !selectedMall}
          />
        )}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="mt-4 flex items-center justify-center">
            <div className="flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <span className="text-sm font-medium text-blue-700">파일을 분석하고 있습니다...</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3">
            <p className="text-sm font-medium text-rose-700">{error}</p>
          </div>
        )}
      </div>

      {/* Results */}
      {uploadResult && (
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-900">업로드 결과</h2>
              {uploadType === 'shopping_mall' && uploadResult.mallName && (
                <Badge variant="secondary" className="bg-violet-100 text-violet-700">
                  {uploadResult.mallName}
                </Badge>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleClear} className="text-slate-600">
              새 파일 업로드
            </Button>
          </div>
          <UploadResult data={uploadResult} uploadType={uploadType} />
        </div>
      )}
    </AppShell>
  )
}

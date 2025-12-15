'use client'

import { Download, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

import { downloadShoppingMallExcel } from './utils'

interface ShoppingMallDownloadButtonProps {
  mallName?: string
  uploadId?: number
}

export function ShoppingMallDownloadButton({ uploadId, mallName }: ShoppingMallDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  async function handleDownload() {
    if (!uploadId) {
      toast.error('다운로드할 데이터가 없어요')
      return
    }

    setIsDownloading(true)

    try {
      await downloadShoppingMallExcel(uploadId, mallName)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '다운로드 중 오류가 발생했어요')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Button disabled={isDownloading || !uploadId} onClick={handleDownload} variant="outline">
      {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
      엑셀 다운로드
    </Button>
  )
}

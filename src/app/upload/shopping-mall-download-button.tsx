'use client'

import { Download, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

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
      const response = await fetch('/api/upload/shopping-mall-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId }),
      })

      if (!response.ok) {
        const { error } = (await response.json()) as { error?: string }
        throw new Error(error || '다운로드에 실패했어요')
      }

      const blob = await response.blob()
      const disposition = response.headers.get('content-disposition')
      const fileName =
        getFileNameFromDisposition(disposition) ??
        `${mallName || '쇼핑몰'}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`

      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = fileName
      link.click()
      URL.revokeObjectURL(link.href)
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

function getFileNameFromDisposition(disposition: string | null): string | null {
  if (!disposition) return null
  const match = disposition.match(/filename=\"(?<name>.+?)\"/i)
  const name = match?.groups?.name
  return name ? decodeURIComponent(name) : null
}

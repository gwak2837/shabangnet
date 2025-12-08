'use client'

import { Download, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

interface SabangnetDownloadButtonProps {
  mallName?: string
  orderNumbers: string[]
}

export function SabangnetDownloadButton({ orderNumbers, mallName }: SabangnetDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  async function handleDownload() {
    if (orderNumbers.length === 0) {
      toast.error('다운로드할 주문이 없습니다')
      return
    }

    setIsDownloading(true)

    try {
      const response = await fetch('/api/upload/sabangnet-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumbers, mallName }),
      })

      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error || '다운로드 실패')
      }

      const blob = await response.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `사방넷양식_${mallName || '업로드'}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '다운로드 중 오류가 발생했어요')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Button disabled={isDownloading || orderNumbers.length === 0} onClick={handleDownload} variant="outline">
      {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
      사방넷 양식 다운로드
    </Button>
  )
}

'use client'

import { useQuery } from '@tanstack/react-query'
import { Download, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { queryKeys } from '@/common/constants/query-keys'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { getCommonTemplateTestCandidates } from './action'

export function TestDownloadSection() {
  const { data: candidates, isLoading } = useQuery({
    queryKey: queryKeys.orderTemplates.commonTestCandidates,
    queryFn: getCommonTemplateTestCandidates,
  })

  const [manufacturerId, setManufacturerId] = useState<string>('')
  const [isDownloading, setIsDownloading] = useState(false)

  const options = candidates ?? []

  async function handleDownload() {
    const id = Number(manufacturerId)
    if (!Number.isFinite(id) || id <= 0) {
      toast.error('테스트할 제조사를 선택해 주세요')
      return
    }

    setIsDownloading(true)
    try {
      const searchParams = new URLSearchParams()
      searchParams.set('manufacturer-id', String(id))
      searchParams.set('limit', '50')

      const response = await fetch(`/api/orders/download?${searchParams.toString()}`)
      if (!response.ok) {
        const { error } = (await response.json()) as { error?: string }
        throw new Error(error || '다운로드에 실패했어요')
      }

      const blob = await response.blob()
      const disposition = response.headers.get('content-disposition')
      const fileName =
        getFileNameFromDisposition(disposition) ??
        `발주서_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`

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
    <>
      <div className="flex flex-col gap-1">
        <Label className="text-sm font-medium">테스트 다운로드</Label>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Select disabled={isLoading || options.length === 0} onValueChange={setManufacturerId} value={manufacturerId}>
          <SelectTrigger aria-disabled={isLoading || options.length === 0} className="aria-disabled:opacity-50">
            <SelectValue
              placeholder={
                isLoading ? '불러오는 중...' : options.length > 0 ? '제조사를 선택해요' : '테스트할 제조사가 없어요'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {options.map((m) => (
              <SelectItem key={m.manufacturerId} value={String(m.manufacturerId)}>
                {m.manufacturerName} <span className="text-muted-foreground">({m.orderCount}건)</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          className="gap-2"
          disabled={isDownloading || !manufacturerId}
          onClick={() => void handleDownload()}
          type="button"
          variant="outline"
        >
          {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          엑셀 다운로드
        </Button>
      </div>
    </>
  )
}

function getFileNameFromDisposition(disposition: string | null): string | null {
  if (!disposition) return null
  const match = disposition.match(/filename="(?<name>.+?)"/i)
  return match?.groups?.name ? decodeURIComponent(match.groups.name) : null
}

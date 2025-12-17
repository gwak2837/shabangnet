'use client'

import { CheckCircle2, Clock, FileSpreadsheet, Link2, Loader2, Mail, RefreshCw, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

import { sendOrderBatch } from '../action'
import { type OrderBatch, type OrderFilters as OrderFiltersType, useOrderBatches, useOrderBatchSummary } from '../hook'
import { OrderFilters } from '../order-filters'
import { PreviewModal } from '../preview-modal'
import { SendModal } from '../send-modal'
import { OrderTable } from './order-table'

interface BulkSendState {
  currentManufacturerName?: string
  failed: number
  isRunning: boolean
  processed: number
  skipped: number
  success: number
  total: number
}

interface OrderBatchesResponse {
  items: OrderBatch[]
  nextCursor: number | null
}

export default function SendableOrdersPage() {
  const [selectedBatch, setSelectedBatch] = useState<OrderBatch | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [previewBatch, setPreviewBatch] = useState<OrderBatch | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [bulkSend, setBulkSend] = useState<BulkSendState>({
    isRunning: false,
    processed: 0,
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    currentManufacturerName: undefined,
  })
  const bulkCancelRef = useRef(false)
  const [filters, setFilters] = useState<OrderFiltersType>({})
  const { data, isLoading, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useOrderBatches({ filters })
  const { data: summary, isLoading: isLoadingSummary, refetch: refetchSummary } = useOrderBatchSummary({ filters })

  const orderBatches = useMemo(() => {
    if (!data?.pages) return []
    return data.pages.flatMap((page) => page.items)
  }, [data])

  function handleSendEmail(batch: OrderBatch) {
    setSelectedBatch(batch)
    setIsModalOpen(true)
  }

  async function runBulkSend(batches: OrderBatch[]) {
    if (bulkSend.isRunning) {
      return
    }

    const targets = batches.filter((b) => b.totalOrders > 0)

    if (targets.length === 0) {
      toast.error('발송할 제조사가 없어요')
      return
    }

    bulkCancelRef.current = false
    setBulkSend({
      isRunning: true,
      processed: 0,
      total: targets.length,
      success: 0,
      failed: 0,
      skipped: 0,
      currentManufacturerName: targets[0]?.manufacturerName,
    })

    let success = 0
    let failed = 0
    let skipped = 0

    for (let i = 0; i < targets.length; i++) {
      const batch = targets[i]

      if (bulkCancelRef.current) {
        break
      }

      setBulkSend((prev) => ({
        ...prev,
        processed: i,
        currentManufacturerName: batch.manufacturerName,
      }))

      // 재발송은 사유가 필요해서 자동 발송에서 제외
      if (batch.status === 'sent') {
        skipped += 1
        setBulkSend((prev) => ({ ...prev, skipped, processed: i + 1 }))
        continue
      }

      try {
        const result = await sendOrderBatch({
          manufacturerId: batch.manufacturerId,
          orderIds: batch.orders.map((o) => o.id),
          mode: 'send',
        })

        if (result.success) {
          success += 1
        } else if (result.requiresEmailSetup || result.requiresReason) {
          skipped += 1
        } else {
          failed += 1
        }
      } catch {
        failed += 1
      }

      setBulkSend((prev) => ({ ...prev, success, failed, skipped, processed: i + 1 }))
    }

    setBulkSend((prev) => ({ ...prev, isRunning: false, currentManufacturerName: undefined }))

    if (bulkCancelRef.current) {
      toast('전체 발송을 중단했어요')
    } else {
      if (success > 0) {
        toast.success(`발송 ${success}건 완료됐어요`)
      }
      if (skipped > 0) {
        toast(`사유 입력/이메일 설정이 필요한 ${skipped}건은 건너뛰었어요`)
      }
      if (failed > 0) {
        toast.error(`${failed}건은 발송에 실패했어요`)
      }
    }

    await refetch()
    await refetchSummary()
  }

  async function fetchAllPendingBatches(): Promise<OrderBatch[]> {
    const all: OrderBatch[] = []
    let cursor: number | null = null

    // NOTE: 전체 발송은 현재 필터 범위 내에서 "pending"만 대상으로 처리해요.
    while (true) {
      const searchParams = new URLSearchParams()
      searchParams.set('limit', '100')
      searchParams.set('status', 'pending')
      if (cursor) {
        searchParams.set('cursor', String(cursor))
      }
      if (filters.search) {
        searchParams.set('search', filters.search)
      }
      if (filters.manufacturerId) {
        searchParams.set('manufacturer-id', String(filters.manufacturerId))
      }
      if (filters.dateFrom) {
        searchParams.set('date-from', filters.dateFrom)
      }
      if (filters.dateTo) {
        searchParams.set('date-to', filters.dateTo)
      }

      const response = await fetch(`/api/orders?${searchParams.toString()}`, { cache: 'no-store' })

      if (!response.ok) {
        const { error } = (await response.json()) as { error?: string }
        throw new Error(error || '발송 대상을 불러오지 못했어요')
      }

      const page = (await response.json()) as OrderBatchesResponse
      all.push(...page.items)

      if (!page.nextCursor) {
        break
      }

      cursor = page.nextCursor
    }

    return all
  }

  function handleBatchSend(batches: OrderBatch[]) {
    void runBulkSend(batches)
  }

  const handleSendAllPending = async () => {
    try {
      const pendingBatchesList = await fetchAllPendingBatches()
      await runBulkSend(pendingBatchesList)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '전체 발송을 시작하지 못했어요')
    }
  }

  const handleModalClose = (open: boolean) => {
    setIsModalOpen(open)
    if (!open) {
      setSelectedBatch(null)
    }
  }

  const handleCancelBulkSend = () => {
    bulkCancelRef.current = true
  }

  const handlePreview = (batch: OrderBatch) => {
    setPreviewBatch(batch)
    setIsPreviewOpen(true)
  }

  const handleDownload = async (batch: OrderBatch) => {
    try {
      const orderIds = batch.orders.map((o) => o.id)

      if (orderIds.length === 0) {
        toast.error('다운로드할 주문이 없어요')
        return
      }

      const searchParams = new URLSearchParams()
      searchParams.set('manufacturer-id', String(batch.manufacturerId))
      searchParams.set('order-ids', orderIds.join(','))

      const response = await fetch(`/api/orders/download?${searchParams.toString()}`)

      if (!response.ok) {
        const { error } = (await response.json()) as { error?: string }
        throw new Error(error || '다운로드에 실패했어요')
      }

      const blob = await response.blob()
      const disposition = response.headers.get('content-disposition')
      const fileName =
        getFileNameFromDisposition(disposition) ??
        `발주서_${batch.manufacturerName}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`

      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = fileName
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '다운로드 중 오류가 발생했어요')
    }
  }

  // Calculate summary stats
  const stats = useMemo(() => {
    return (
      summary ?? {
        totalBatches: 0,
        pendingBatchesCount: 0,
        sentBatches: 0,
        errorBatches: 0,
        totalOrders: 0,
      }
    )
  }, [summary])

  if (isLoading || isLoadingSummary) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <>
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <FileSpreadsheet className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">전체</p>
              <p className="text-xl font-semibold text-slate-900">{stats.totalBatches}건</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">대기중</p>
              <p className="text-xl font-semibold text-slate-900">{stats.pendingBatchesCount}건</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">발송완료</p>
              <p className="text-xl font-semibold text-slate-900">{stats.sentBatches}건</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50">
              <XCircle className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">오류</p>
              <p className="text-xl font-semibold text-slate-900">{stats.errorBatches}건</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Row */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <OrderFilters filters={filters} onFiltersChange={setFilters} />
        <div className="flex items-center gap-2">
          <Button
            className="gap-2"
            onClick={() => {
              void refetch()
              void refetchSummary()
            }}
            size="sm"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4" />
            새로고침
          </Button>
          <Button
            className="gap-2 bg-blue-600 hover:bg-blue-700"
            disabled={stats.pendingBatchesCount === 0 || bulkSend.isRunning}
            onClick={handleSendAllPending}
            size="sm"
          >
            <Mail className="h-4 w-4" />
            {bulkSend.isRunning ? '발송 중...' : `전체 발송 (${stats.pendingBatchesCount})`}
          </Button>
        </div>
      </div>

      {orderBatches.length === 0 && (
        <Card className="border-slate-200 bg-card shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 shrink-0">
                <Link2 className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">발송 대상이 없어요</p>
                <p className="mt-1 text-sm text-slate-600">
                  업로드된 주문이 제조사와 연결되지 않으면 여기에 표시되지 않아요.
                  <br />
                  상품/옵션 연결을 추가하면 기존 주문에도 자동으로 반영돼요.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href="/product">상품 연결</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/option-mapping">옵션 연결</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/manufacturer">제조사 관리</Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Table */}
      <OrderTable
        batches={orderBatches}
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onBatchSend={handleBatchSend}
        onDownload={handleDownload}
        onPreview={handlePreview}
        onSendEmail={handleSendEmail}
      />

      {/* Send Modal */}
      {bulkSend.isRunning && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-slate-900 px-4 py-3 text-sm text-primary-foreground shadow-lg">
          <div className="flex items-center gap-3">
            <span>
              전체 발송: {bulkSend.processed} / {bulkSend.total}
            </span>
            <Button onClick={handleCancelBulkSend} size="sm" variant="secondary">
              중단
            </Button>
          </div>
          {bulkSend.currentManufacturerName && (
            <p className="mt-2 text-xs text-primary-foreground/80">처리 중: {bulkSend.currentManufacturerName}</p>
          )}
        </div>
      )}
      <SendModal
        batch={selectedBatch}
        onOpenChange={handleModalClose}
        onSent={() => {
          void refetch()
          void refetchSummary()
        }}
        open={isModalOpen}
      />
      <PreviewModal batch={previewBatch} onOpenChange={setIsPreviewOpen} open={isPreviewOpen} />
    </>
  )
}

function getFileNameFromDisposition(disposition: string | null): string | null {
  if (!disposition) return null
  const match = disposition.match(/filename=\"(?<name>.+?)\"/i)
  const name = match?.groups?.name
  return name ? decodeURIComponent(name) : null
}

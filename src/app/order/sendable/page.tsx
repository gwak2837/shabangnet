'use client'

import { AlertCircle, CheckCircle2, Clock, FileSpreadsheet, Loader2, Mail, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { downloadOrderExcel } from '@/services/orders'

import { type OrderBatch, type OrderFilters as OrderFiltersType, useOrderBatches } from '../hook'
import { OrderFilters } from '../order-filters'
import { OrderTable } from '../order-table'
import { SendModal } from '../send-modal'

export default function SendableOrdersPage() {
  const [selectedBatch, setSelectedBatch] = useState<OrderBatch | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [sendQueue, setSendQueue] = useState<OrderBatch[]>([])
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0)
  const [filters, setFilters] = useState<OrderFiltersType>({})
  const { data, isLoading, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useOrderBatches({ filters })

  const orderBatches = useMemo(() => {
    if (!data?.pages) return []
    return data.pages.flatMap((page) => page.items)
  }, [data])

  function handleSendEmail(batch: OrderBatch) {
    setSelectedBatch(batch)
    setSendQueue([batch])
    setCurrentQueueIndex(0)
    setIsModalOpen(true)
  }

  function handleBatchSend(batches: OrderBatch[]) {
    if (batches.length === 0) {
      return
    }

    setSendQueue(batches)
    setCurrentQueueIndex(0)
    setSelectedBatch(batches[0])
    setIsModalOpen(true)
  }

  const handleSendAllPending = () => {
    const pendingBatchesList = orderBatches.filter((b) => b.status === 'pending')
    handleBatchSend(pendingBatchesList)
  }

  const handleModalClose = (open: boolean) => {
    if (!open) {
      // 모달이 닫힐 때, 큐에 다음 항목이 있으면 계속 진행
      if (currentQueueIndex < sendQueue.length - 1) {
        const nextIndex = currentQueueIndex + 1
        setCurrentQueueIndex(nextIndex)
        setSelectedBatch(sendQueue[nextIndex])
        setIsModalOpen(true)
      } else {
        setIsModalOpen(false)
        setSendQueue([])
        setCurrentQueueIndex(0)
      }
    } else {
      setIsModalOpen(open)
    }
  }

  const handlePreview = (batch: OrderBatch) => {
    // In real app, this would open a preview modal or navigate to preview page
    console.log('Preview batch:', batch)
  }

  const handleDownload = async (batch: OrderBatch) => {
    try {
      const orderIds = batch.orders.map((o) => o.id)
      const result = await downloadOrderExcel({
        manufacturerId: batch.manufacturerId,
        orderIds,
      })

      if ('error' in result) {
        console.error(result.error)
        // TODO: Show error toast
        return
      }

      // Create blob and download
      const byteCharacters = atob(result.base64)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed', error)
      // TODO: Show error toast
    }
  }

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalBatches = orderBatches.length
    const pendingBatchesCount = orderBatches.filter((b) => b.status === 'pending').length
    const sentBatches = orderBatches.filter((b) => b.status === 'sent').length
    const errorBatches = orderBatches.filter((b) => b.status === 'error').length
    const totalOrders = orderBatches.reduce((sum, b) => sum + b.totalOrders, 0)
    return { totalBatches, pendingBatchesCount, sentBatches, errorBatches, totalOrders }
  }, [orderBatches])

  if (isLoading) {
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
              <AlertCircle className="h-5 w-5 text-rose-600" />
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
          <Button className="gap-2" onClick={() => refetch()} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4" />
            새로고침
          </Button>
          <Button
            className="gap-2 bg-blue-600 hover:bg-blue-700"
            disabled={stats.pendingBatchesCount === 0}
            onClick={handleSendAllPending}
            size="sm"
          >
            <Mail className="h-4 w-4" />
            전체 발송 ({stats.pendingBatchesCount})
          </Button>
        </div>
      </div>

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
      {sendQueue.length > 1 && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-slate-900 px-4 py-2 text-sm text-primary-foreground shadow-lg">
          발송 진행: {currentQueueIndex + 1} / {sendQueue.length}
        </div>
      )}
      <SendModal batch={selectedBatch} onOpenChange={handleModalClose} open={isModalOpen} />
    </>
  )
}

'use client'

import { AlertCircle, Ban, CheckCircle2, Clock, FileSpreadsheet, Loader2, Mail, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { OrderBatch } from '@/lib/mock-data'

import { AppShell } from '@/components/layout'
import { ExcludedOrderTable, OrderFilters, OrderTable, SendModal } from '@/components/orders'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useExcludedOrderBatches, useOrderBatches } from '@/hooks'

type TabType = 'excluded' | 'sendable'

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<TabType>('sendable')
  const [selectedBatch, setSelectedBatch] = useState<OrderBatch | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [sendQueue, setSendQueue] = useState<OrderBatch[]>([])
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0)

  const { data: orderBatches = [], isLoading: isLoadingBatches, refetch: refetchBatches } = useOrderBatches()
  const { data: excludedOrderBatches = [], isLoading: isLoadingExcluded } = useExcludedOrderBatches()

  const handleSendEmail = (batch: OrderBatch) => {
    setSelectedBatch(batch)
    setSendQueue([batch])
    setCurrentQueueIndex(0)
    setIsModalOpen(true)
  }

  const handleBatchSend = (batches: OrderBatch[]) => {
    if (batches.length === 0) return
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

  const handleRefresh = () => {
    refetchBatches()
  }

  // Calculate summary stats for sendable orders
  const stats = useMemo(() => {
    const totalBatches = orderBatches.length
    const pendingBatchesCount = orderBatches.filter((b) => b.status === 'pending').length
    const sentBatches = orderBatches.filter((b) => b.status === 'sent').length
    const errorBatches = orderBatches.filter((b) => b.status === 'error').length
    const excludedOrdersCount = excludedOrderBatches.reduce((sum, b) => sum + b.totalOrders, 0)
    const totalOrders = orderBatches.reduce((sum, b) => sum + b.totalOrders, 0)
    return { totalBatches, pendingBatchesCount, sentBatches, errorBatches, excludedOrdersCount, totalOrders }
  }, [orderBatches, excludedOrderBatches])

  if (isLoadingBatches || isLoadingExcluded) {
    return (
      <AppShell description="제조사별 발주서를 생성하고 이메일로 발송하세요" title="발주 생성/발송">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell description="제조사별 발주서를 생성하고 이메일로 발송하세요" title="발주 생성/발송">
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-slate-200">
        <button
          className={`relative px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'sendable' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('sendable')}
        >
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            발송 대상
            <Badge
              className={`${activeTab === 'sendable' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}
              variant="secondary"
            >
              {stats.totalOrders}
            </Badge>
          </div>
          {activeTab === 'sendable' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
        </button>
        <button
          className={`relative px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'excluded' ? 'text-violet-600' : 'text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('excluded')}
        >
          <div className="flex items-center gap-2">
            <Ban className="h-4 w-4" />
            발송 제외
            <Badge
              className={`${
                activeTab === 'excluded' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'
              }`}
              variant="secondary"
            >
              {stats.excludedOrdersCount}
            </Badge>
          </div>
          {activeTab === 'excluded' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600" />}
        </button>
      </div>

      {activeTab === 'sendable' ? (
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
          <div className="flex items-center justify-between mb-6">
            <OrderFilters />
            <div className="flex items-center gap-2">
              <Button className="gap-2" onClick={handleRefresh} size="sm" variant="outline">
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
            onBatchSend={handleBatchSend}
            onPreview={handlePreview}
            onSendEmail={handleSendEmail}
          />
        </>
      ) : (
        <>
          {/* Excluded Orders Info */}
          <div className="mb-6 rounded-lg border border-violet-200 bg-violet-50 p-4">
            <div className="flex items-start gap-3">
              <Ban className="h-5 w-5 text-violet-600 mt-0.5" />
              <div>
                <p className="font-medium text-violet-800">발송 제외 주문</p>
                <p className="text-sm text-violet-700 mt-1">
                  F열 값이 설정된 제외 패턴과 일치하는 주문입니다. 이 주문들은 이메일 발송 대상에서 자동으로 제외됩니다.
                </p>
              </div>
            </div>
          </div>

          {/* Excluded Order Table */}
          <ExcludedOrderTable batches={excludedOrderBatches} />
        </>
      )}

      {/* Send Modal */}
      {sendQueue.length > 1 && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
          발송 진행: {currentQueueIndex + 1} / {sendQueue.length}
        </div>
      )}
      <SendModal batch={selectedBatch} onOpenChange={handleModalClose} open={isModalOpen} />
    </AppShell>
  )
}

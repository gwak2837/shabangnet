'use client'

import { AlertTriangle, CheckCircle2, Loader2, Mail, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { SendLog } from '@/services/logs'

import { DeleteSendLogsDialog } from '@/components/log/delete-send-logs-dialog'
import { LogDetailModal } from '@/components/log/log-detail-modal'
import { LogFilters } from '@/components/log/log-filters'
import { LogTable } from '@/components/log/log-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { InfiniteScrollSentinel } from '@/components/ui/infinite-scroll-sentinel'
import { useSendLogs } from '@/hooks/use-logs'
import { useManufacturers } from '@/hooks/use-manufacturers'
import { authClient } from '@/lib/auth-client'

export function SendLogsView() {
  const { data: session } = authClient.useSession()
  const isAdmin = session?.user?.isAdmin ?? false

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [status, setStatus] = useState('all')
  const [manufacturer, setManufacturer] = useState('all')
  const [selectedLog, setSelectedLog] = useState<SendLog | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingLogs,
    isError,
    error,
    refetch,
  } = useSendLogs({
    filters: {
      manufacturerId: manufacturer !== 'all' ? Number(manufacturer) : undefined,
      status: status as 'all' | 'failed' | 'pending' | 'success',
      startDate: dateFrom || undefined,
      endDate: dateTo || undefined,
    },
  })
  const logs = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data])
  const { data: manufacturers = [] } = useManufacturers()

  const effectiveSelectedIds = useMemo(() => {
    if (!isAdmin || selectedIds.length === 0) return []
    const visible = new Set(logs.map((l) => l.id))
    return selectedIds.filter((id) => visible.has(id))
  }, [isAdmin, logs, selectedIds])

  function handleSelectAll(checked: boolean) {
    if (!isAdmin) return
    if (checked) {
      setSelectedIds(logs.map((log) => log.id))
    } else {
      setSelectedIds([])
    }
  }

  function handleSelectLog(id: number, checked: boolean) {
    if (!isAdmin) return
    if (checked) {
      setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    } else {
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id))
    }
  }

  function handleDeleteSuccess() {
    setSelectedIds([])
  }

  const handleViewDetail = (log: SendLog) => {
    setSelectedLog(log)
    setIsDetailOpen(true)
  }

  // Calculate stats
  const stats = useMemo(() => {
    const summary = data?.pages[0]?.summary
    return {
      totalLogs: summary?.totalLogs ?? 0,
      successLogs: summary?.successLogs ?? 0,
      failedLogs: summary?.failedLogs ?? 0,
    }
  }, [data?.pages])

  if (isLoadingLogs) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (isError) {
    const errorMessage = error instanceof Error ? error.message : '발송 기록을 불러오지 못했어요.'

    return (
      <Card className="border-slate-200 bg-card shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">발송 기록을 불러오지 못했어요</p>
              <p className="mt-1 text-sm text-slate-600 break-words">{errorMessage}</p>
            </div>
            <Button onClick={() => refetch()} size="sm" variant="outline">
              다시 시도
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">전체 발송</p>
              <p className="text-xl font-semibold text-slate-900">{stats.totalLogs}건</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">성공</p>
              <p className="text-xl font-semibold text-slate-900">{stats.successLogs}건</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50">
              <XCircle className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">실패</p>
              <p className="text-xl font-semibold text-slate-900">{stats.failedLogs}건</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <LogFilters
            dateFrom={dateFrom}
            dateTo={dateTo}
            manufacturer={manufacturer}
            manufacturers={manufacturers}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onManufacturerChange={setManufacturer}
            onStatusChange={setStatus}
            status={status}
          />
          {isAdmin ? <DeleteSendLogsDialog onSuccess={handleDeleteSuccess} selectedIds={effectiveSelectedIds} /> : null}
        </div>
      </div>

      {/* Log Table */}
      <LogTable
        isAdmin={isAdmin}
        logs={logs}
        onSelectAll={handleSelectAll}
        onSelectLog={handleSelectLog}
        onViewDetail={handleViewDetail}
        selectedIds={effectiveSelectedIds}
      />

      {isFetchingNextPage ? (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />더 불러오는 중...
        </div>
      ) : null}

      <InfiniteScrollSentinel hasMore={hasNextPage} isLoading={isFetchingNextPage} onLoadMore={() => fetchNextPage()} />

      {/* Detail Modal */}
      <LogDetailModal log={selectedLog} onOpenChange={setIsDetailOpen} open={isDetailOpen} />
    </>
  )
}

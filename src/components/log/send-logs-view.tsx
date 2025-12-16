'use client'

import { CheckCircle2, Loader2, Mail, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { SendLog } from '@/services/logs'

import { DeleteSendLogsDialog } from '@/components/log/delete-send-logs-dialog'
import { LogDetailModal } from '@/components/log/log-detail-modal'
import { LogFilters } from '@/components/log/log-filters'
import { LogTable } from '@/components/log/log-table'
import { Card, CardContent } from '@/components/ui/card'
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

  const { data: logs = [], isLoading: isLoadingLogs } = useSendLogs()
  const { data: manufacturers = [] } = useManufacturers()

  const filteredLogs = useMemo(() => {
    return logs
      .filter((log) => {
        // Date filter
        if (dateFrom) {
          const logDate = new Date(log.sentAt).toISOString().split('T')[0]
          if (logDate < dateFrom) return false
        }
        if (dateTo) {
          const logDate = new Date(log.sentAt).toISOString().split('T')[0]
          if (logDate > dateTo) return false
        }

        // Status filter
        if (status !== 'all' && log.status !== status) return false

        // Manufacturer filter
        if (manufacturer !== 'all' && log.manufacturerId !== Number(manufacturer)) return false

        return true
      })
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
  }, [logs, dateFrom, dateTo, status, manufacturer])

  const effectiveSelectedIds = useMemo(() => {
    if (!isAdmin || selectedIds.length === 0) return []
    const visible = new Set(filteredLogs.map((l) => l.id))
    return selectedIds.filter((id) => visible.has(id))
  }, [filteredLogs, isAdmin, selectedIds])

  function handleSelectAll(checked: boolean) {
    if (!isAdmin) return
    if (checked) {
      setSelectedIds(filteredLogs.map((log) => log.id))
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
    const totalLogs = logs.length
    const successLogs = logs.filter((l) => l.status === 'success').length
    const failedLogs = logs.filter((l) => l.status === 'failed').length
    return { totalLogs, successLogs, failedLogs }
  }, [logs])

  if (isLoadingLogs) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
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
        logs={filteredLogs}
        onSelectAll={handleSelectAll}
        onSelectLog={handleSelectLog}
        onViewDetail={handleViewDetail}
        selectedIds={effectiveSelectedIds}
      />

      {/* Detail Modal */}
      <LogDetailModal log={selectedLog} onOpenChange={setIsDetailOpen} open={isDetailOpen} />
    </>
  )
}

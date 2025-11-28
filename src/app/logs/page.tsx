'use client'

import { CheckCircle2, Loader2, Mail, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { SendLog } from '@/lib/mock-data'

import { AppShell } from '@/components/layout/app-shell'
import { LogDetailModal } from '@/components/logs/log-detail-modal'
import { LogFilters } from '@/components/logs/log-filters'
import { LogTable } from '@/components/logs/log-table'
import { Card, CardContent } from '@/components/ui/card'
import { useSendLogs } from '@/hooks/use-logs'
import { useManufacturers } from '@/hooks/use-manufacturers'

export default function LogsPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [status, setStatus] = useState('all')
  const [manufacturer, setManufacturer] = useState('all')
  const [selectedLog, setSelectedLog] = useState<SendLog | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

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
        if (manufacturer !== 'all' && log.manufacturerId !== manufacturer) return false

        return true
      })
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
  }, [logs, dateFrom, dateTo, status, manufacturer])

  const handleViewDetail = (log: SendLog) => {
    setSelectedLog(log)
    setIsDetailOpen(true)
  }

  const handleDownloadExcel = (log: SendLog) => {
    // CSV 형식으로 데이터 생성
    const headers = ['주문번호', '상품명', '옵션', '수량', '금액', '고객명', '배송주소']
    const rows = log.orders.map((order) => [
      order.orderNumber,
      order.productName,
      order.optionName,
      order.quantity.toString(),
      order.price.toLocaleString() + '원',
      order.customerName,
      order.address,
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    // BOM 추가하여 한글 깨짐 방지
    const bom = '\uFEFF'
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `${log.manufacturerName}_${new Date(log.sentAt).toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
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
      <AppShell description="이메일 발송 이력을 확인합니다" title="발송 로그">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell description="이메일 발송 이력을 확인합니다" title="발송 로그">
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
      </div>

      {/* Log Table */}
      <LogTable logs={filteredLogs} onDownloadExcel={handleDownloadExcel} onViewDetail={handleViewDetail} />

      {/* Detail Modal */}
      <LogDetailModal log={selectedLog} onOpenChange={setIsDetailOpen} open={isDetailOpen} />
    </AppShell>
  )
}

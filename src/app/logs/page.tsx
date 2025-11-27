'use client'

import { useState, useMemo } from 'react'
import { AppShell } from '@/components/layout'
import { LogFilters, LogTable, LogDetailModal } from '@/components/logs'
import { Card, CardContent } from '@/components/ui/card'
import { sendLogs, type SendLog } from '@/lib/mock-data'
import { Mail, CheckCircle2, XCircle } from 'lucide-react'

export default function LogsPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [status, setStatus] = useState('all')
  const [manufacturer, setManufacturer] = useState('all')
  const [selectedLog, setSelectedLog] = useState<SendLog | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const filteredLogs = useMemo(() => {
    return sendLogs
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
  }, [dateFrom, dateTo, status, manufacturer])

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
  const totalLogs = sendLogs.length
  const successLogs = sendLogs.filter((l) => l.status === 'success').length
  const failedLogs = sendLogs.filter((l) => l.status === 'failed').length

  return (
    <AppShell title="발송 로그" description="이메일 발송 이력을 확인합니다">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">전체 발송</p>
              <p className="text-xl font-semibold text-slate-900">{totalLogs}건</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">성공</p>
              <p className="text-xl font-semibold text-slate-900">{successLogs}건</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50">
              <XCircle className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">실패</p>
              <p className="text-xl font-semibold text-slate-900">{failedLogs}건</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <LogFilters
          dateFrom={dateFrom}
          dateTo={dateTo}
          status={status}
          manufacturer={manufacturer}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onStatusChange={setStatus}
          onManufacturerChange={setManufacturer}
        />
      </div>

      {/* Log Table */}
      <LogTable logs={filteredLogs} onViewDetail={handleViewDetail} onDownloadExcel={handleDownloadExcel} />

      {/* Detail Modal */}
      <LogDetailModal open={isDetailOpen} onOpenChange={setIsDetailOpen} log={selectedLog} />
    </AppShell>
  )
}

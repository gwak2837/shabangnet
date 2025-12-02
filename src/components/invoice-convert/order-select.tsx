'use client'

import { CheckCircle2, Mail, Package } from 'lucide-react'

import type { SendLog } from '@/services/logs'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/utils/cn'
import { formatCurrency, formatDateTime } from '@/utils/format'

interface OrderSelectProps {
  logs: SendLog[]
  onSelect: (log: SendLog) => void
  selectedLog: SendLog | null
}

export function OrderSelect({ logs, selectedLog, onSelect }: OrderSelectProps) {
  // 발송 완료된 로그만 필터링
  const completedLogs = logs.filter((log) => log.status === 'success')

  return (
    <Card className="border-slate-200 bg-card shadow-sm py-6">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <Mail className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-lg">발주 이력 선택</CardTitle>
            <CardDescription>송장을 등록할 발송 완료 건을 선택하세요</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-2">
          {completedLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Mail className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>발송 완료된 발주 이력이 없습니다</p>
            </div>
          ) : (
            completedLogs.map((log) => (
              <button
                className={cn(
                  'w-full text-left rounded-lg border p-4 transition-all hover:shadow-sm',
                  selectedLog?.id === log.id
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                )}
                key={log.id}
                onClick={() => onSelect(log)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 truncate">{log.manufacturerName}</span>
                      <Badge className="bg-emerald-100 text-emerald-700" variant="secondary">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        발송완료
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{formatDateTime(log.sentAt)}</p>
                  </div>
                  <div className="text-right ml-4">
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <Package className="h-4 w-4" />
                      <span>{log.orderCount}건</span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 mt-1">{formatCurrency(log.totalAmount)}</p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-500 truncate">파일: {log.fileName}</p>
                </div>
              </button>
            ))
          )}
        </div>

        {selectedLog && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">선택됨:</span>
              <span className="font-medium text-slate-900">
                {selectedLog.manufacturerName} ({selectedLog.orderCount}건)
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

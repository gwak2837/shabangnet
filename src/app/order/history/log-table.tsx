'use client'

import { CheckCircle2, Eye, FileSpreadsheet, Mail, XCircle } from 'lucide-react'

import type { SendLog } from '@/services/logs'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { shouldToggleRowSelection, TableSelectionCell, TableSelectionHeadCell } from '@/components/ui/table-selection'
import { formatRelativeTime } from '@/utils/format/date'
import { formatCurrency, formatDateTime } from '@/utils/format/number'

interface LogTableProps {
  isAdmin?: boolean
  logs: SendLog[]
  onSelectAll?: (checked: boolean) => void
  onSelectLog?: (id: number, checked: boolean) => void
  onViewDetail: (log: SendLog) => void
  selectedIds?: number[]
}

export function LogTable({
  logs,
  onViewDetail,
  isAdmin = false,
  selectedIds = [],
  onSelectAll,
  onSelectLog,
}: LogTableProps) {
  const visibleIds = logs.map((log) => log.id)
  const visibleIdSet = new Set(visibleIds)
  const effectiveSelectedIds = selectedIds.filter((id) => visibleIdSet.has(id))
  const effectiveSelectedIdSet = new Set(effectiveSelectedIds)
  const isAllSelected = visibleIds.length > 0 && visibleIds.every((id) => effectiveSelectedIdSet.has(id))
  const isSomeSelected = visibleIds.some((id) => effectiveSelectedIdSet.has(id)) && !isAllSelected
  const colSpan = isAdmin ? 8 : 7

  return (
    <Card className="border-slate-200 bg-card shadow-sm">
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {isAdmin ? (
                <TableSelectionHeadCell
                  aria-label="전체 선택"
                  checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                  onCheckedChange={(checked) => onSelectAll?.(checked)}
                />
              ) : null}
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">발송 일시</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">제조사</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">수신자</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                주문 수
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                금액
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">상태</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow
                aria-selected={isAdmin ? effectiveSelectedIdSet.has(log.id) : undefined}
                className="hover:bg-muted/50 transition-colors aria-selected:bg-muted/50 data-[admin=true]:cursor-pointer"
                data-admin={isAdmin}
                key={log.id}
                onClick={(e) => {
                  if (!isAdmin) {
                    return
                  }
                  if (!shouldToggleRowSelection(e)) {
                    return
                  }
                  onSelectLog?.(log.id, !effectiveSelectedIdSet.has(log.id))
                }}
              >
                {isAdmin ? (
                  <TableSelectionCell
                    aria-label={`${log.manufacturerName} 발송 기록 선택`}
                    checked={effectiveSelectedIdSet.has(log.id)}
                    onCheckedChange={(checked) => onSelectLog?.(log.id, checked)}
                  />
                ) : null}
                <TableCell className="text-sm text-slate-600" title={formatDateTime(log.sentAt)}>
                  {formatRelativeTime(log.sentAt)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-xs font-semibold text-slate-600">
                      {log.manufacturerName.slice(0, 2)}
                    </div>
                    <span className="font-medium text-slate-900">{log.manufacturerName}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {log.emails.join(', ')}
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium text-slate-900 tabular-nums">{log.orderCount}건</TableCell>
                <TableCell className="text-right font-medium text-slate-900 tabular-nums">
                  {formatCurrency(log.totalAmount)}
                </TableCell>
                <TableCell>
                  {log.status === 'success' ? (
                    <Badge className="bg-emerald-100 text-emerald-700 gap-1" variant="secondary">
                      <CheckCircle2 className="h-3 w-3" />
                      성공
                    </Badge>
                  ) : (
                    <Badge className="bg-rose-100 text-rose-700 gap-1" variant="secondary">
                      <XCircle className="h-3 w-3" />
                      실패
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {log.hasAttachment ? (
                      <Button
                        asChild
                        className="h-8 w-8 text-slate-400 hover:text-emerald-600"
                        size="icon"
                        title="엑셀 다운로드"
                        variant="ghost"
                      >
                        <a href={`/api/order/history/${log.id}/download`}>
                          <FileSpreadsheet className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : null}
                    <Button
                      className="h-8 w-8 text-slate-400 hover:text-slate-600"
                      onClick={() => onViewDetail(log)}
                      size="icon"
                      title="상세보기"
                      variant="ghost"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow>
                <TableCell className="h-32 text-center text-slate-500" colSpan={colSpan}>
                  발송 기록이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

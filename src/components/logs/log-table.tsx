'use client'

import { CheckCircle2, Eye, FileSpreadsheet, Mail, XCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDateTime, type SendLog } from '@/lib/mock-data'

interface LogTableProps {
  logs: SendLog[]
  onDownloadExcel?: (log: SendLog) => void
  onViewDetail: (log: SendLog) => void
}

export function LogTable({ logs, onViewDetail, onDownloadExcel }: LogTableProps) {
  return (
    <Card className="border-slate-200 bg-card shadow-sm">
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
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
              <TableRow className="hover:bg-muted/50 transition-colors" key={log.id}>
                <TableCell className="text-sm text-slate-600">{formatDateTime(log.sentAt)}</TableCell>
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
                    {log.email}
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium text-slate-900">{log.orderCount}건</TableCell>
                <TableCell className="text-right font-medium text-slate-900">
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
                    {onDownloadExcel && (
                      <Button
                        className="h-8 w-8 text-slate-400 hover:text-emerald-600"
                        onClick={() => onDownloadExcel(log)}
                        size="icon"
                        title="엑셀 다운로드"
                        variant="ghost"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                      </Button>
                    )}
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
                <TableCell className="h-32 text-center text-slate-500" colSpan={7}>
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

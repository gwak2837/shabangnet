'use client'

import { AlertTriangle, CheckCircle2, Clock, FileSpreadsheet, Mail, User, XCircle } from 'lucide-react'

import type { SendLog } from '@/services/logs'

import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { formatRelativeTime } from '@/utils/format/date'
import { formatCurrency, formatDateTime } from '@/utils/format/number'

interface LogDetailModalProps {
  log: SendLog | null
  onOpenChange: (open: boolean) => void
  open: boolean
}

export function LogDetailModal({ open, onOpenChange, log }: LogDetailModalProps) {
  if (!log) {
    return null
  }

  const isSuccess = log.status === 'success'

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                isSuccess ? 'bg-emerald-100' : 'bg-rose-100'
              }`}
            >
              {isSuccess ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <XCircle className="h-5 w-5 text-rose-600" />
              )}
            </div>
            <div>
              <DialogTitle>발송 상세 정보</DialogTitle>
              <p className="text-sm text-slate-500 mt-0.5">{isSuccess ? '발송 성공' : '발송 실패'}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">상태</span>
            {isSuccess ? (
              <Badge className="bg-emerald-100 text-emerald-700" variant="secondary">
                성공
              </Badge>
            ) : (
              <Badge className="bg-rose-100 text-rose-700" variant="secondary">
                실패
              </Badge>
            )}
          </div>

          <Separator />

          {/* Error Message (if failed) */}
          {!isSuccess && log.errorMessage && (
            <>
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-rose-800">오류 메시지</p>
                    <p className="text-sm text-rose-700 mt-1">{log.errorMessage}</p>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Manufacturer */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">제조사</span>
            <span className="font-medium text-slate-900">{log.manufacturerName}</span>
          </div>

          {/* Email */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">수신자</span>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400" />
              <span className="text-slate-700">{log.email}</span>
            </div>
          </div>

          <Separator />

          {/* Subject */}
          <div>
            <span className="text-sm text-slate-500">메일 제목</span>
            <p className="mt-1 font-medium text-slate-900">{log.subject}</p>
          </div>

          {/* File */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">첨부 파일</span>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span className="text-sm text-slate-700">{log.fileName}</span>
            </div>
          </div>

          <Separator />

          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-slate-500">주문 건수</span>
              <p className="mt-1 font-semibold text-slate-900">{log.orderCount}건</p>
            </div>
            <div>
              <span className="text-sm text-slate-500">총 금액</span>
              <p className="mt-1 font-semibold text-slate-900">{formatCurrency(log.totalAmount)}</p>
            </div>
          </div>

          <Separator />

          {/* Meta Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-slate-500" title={formatDateTime(log.sentAt)}>
              <Clock className="h-4 w-4" />
              {formatRelativeTime(log.sentAt)}
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <User className="h-4 w-4" />
              {log.sentBy}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

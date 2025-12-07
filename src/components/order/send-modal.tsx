'use client'

import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Loader2,
  Mail,
  MapPin,
  Package,
  Send,
  User,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { checkDuplicate, type DuplicateCheckResult, type OrderBatch } from '@/services/orders'
import { getDuplicateCheckSettings } from '@/services/settings'
import {
  formatCurrency,
  formatDateTime,
  formatProductNameWithOption,
  formatRecipientName,
  getDaysDifference,
} from '@/utils/format'

import { sendOrder } from './actions'

interface SendModalProps {
  batch: OrderBatch | null
  onOpenChange: (open: boolean) => void
  open: boolean
}

export function SendModal({ open, onOpenChange, batch }: SendModalProps) {
  const [isSending, setIsSending] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [duplicateReason, setDuplicateReason] = useState('')
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheckResult | null>(null)
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false)
  const [periodDays, setPeriodDays] = useState(10)

  // 중복 체크 결과를 useEffect로 비동기 로드
  useEffect(() => {
    if (!open || !batch) {
      setDuplicateCheck(null)
      return
    }

    async function checkForDuplicates() {
      setIsCheckingDuplicate(true)
      try {
        const settings = await getDuplicateCheckSettings()
        if (!settings.enabled) {
          setDuplicateCheck(null)
          return
        }
        setPeriodDays(settings.periodDays)
        const recipientAddresses = batch!.orders.map((order) => order.address)
        const result = await checkDuplicate(batch!.manufacturerId, recipientAddresses, settings.periodDays)
        setDuplicateCheck(result)
      } catch {
        setDuplicateCheck(null)
      } finally {
        setIsCheckingDuplicate(false)
      }
    }

    checkForDuplicates()
  }, [open, batch])

  if (!batch) {
    return null
  }

  const canSend = !duplicateCheck?.hasDuplicate || duplicateReason.trim().length > 0

  // 모달 닫힐 때 상태 초기화를 위한 핸들러
  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      setDuplicateReason('')
      setSendError(null)
    }
    onOpenChange(newOpen)
  }

  async function handleSend() {
    if (!canSend || !batch) return

    setIsSending(true)
    setSendError(null)

    try {
      const result = await sendOrder({
        manufacturerId: batch.manufacturerId.toString(),
        manufacturerName: batch.manufacturerName,
        email: batch.email,
        orders: batch.orders.map((order) => ({
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          phone: order.phone,
          address: order.address,
          productCode: order.productCode,
          productName: order.productName,
          optionName: order.optionName,
          quantity: order.quantity,
          price: order.price,
        })),
        duplicateReason: duplicateCheck?.hasDuplicate ? duplicateReason : undefined,
      })

      if (result.success) {
        setIsSent(true)
        // Auto close after success
        setTimeout(() => {
          setIsSent(false)
          setDuplicateReason('')
          setSendError(null)
          handleOpenChange(false)
        }, 2000)
      } else {
        setSendError(result.error || '이메일 발송에 실패했습니다.')
      }
    } catch {
      setSendError('서버와 통신 중 오류가 발생했습니다.')
    } finally {
      setIsSending(false)
    }
  }

  const emailBody = `안녕하세요. (주)다온에프앤씨 발주 첨부파일 드립니다.\n\n감사합니다.`

  const emailSubject = `[다온에프앤씨 발주서]_${batch.manufacturerName}_${new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '')}`

  if (isSent) {
    return (
      <Dialog onOpenChange={handleOpenChange} open={open}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">발송 완료</h3>
            <p className="mt-2 text-center text-sm text-slate-500">
              {batch.manufacturerName} 발주서가
              <br />
              성공적으로 발송되었습니다.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-slate-600" />
            이메일 발송
          </DialogTitle>
          <DialogDescription>아래 내용으로 발주서 이메일을 발송합니다.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto flex-1 pr-2">
          {/* Recipient */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-card">
                <User className="h-5 w-5 text-slate-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">{batch.manufacturerName}</p>
                <p className="text-sm text-slate-500">{batch.email}</p>
              </div>
              <Badge className="bg-blue-100 text-blue-700" variant="secondary">
                수신
              </Badge>
            </div>
          </div>

          {/* Order Summary */}
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              <span className="font-medium text-slate-900">첨부 파일</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">
                [다온에프앤씨 발주서]_{batch.manufacturerName}_{new Date().toISOString().slice(0, 10).replace(/-/g, '')}
                .xlsx
              </span>
            </div>
            <Separator className="my-3" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">주문 건수</p>
                <p className="font-semibold text-slate-900">{batch.totalOrders}건</p>
              </div>
              <div>
                <p className="text-slate-500">총 금액</p>
                <p className="font-semibold text-slate-900">{formatCurrency(batch.totalAmount)}</p>
              </div>
            </div>

            {/* Order Details Toggle */}
            <button
              className="mt-3 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              onClick={() => setShowOrderDetails(!showOrderDetails)}
              type="button"
            >
              <Package className="h-4 w-4" />
              주문 상세 {showOrderDetails ? '접기' : '보기'}
              {showOrderDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {/* Order Details List */}
            {showOrderDetails && (
              <div className="mt-3 max-h-48 overflow-y-auto rounded-md border border-slate-100 bg-slate-50">
                <div className="divide-y divide-slate-100">
                  {batch.orders.map((order) => (
                    <div className="px-3 py-2 text-xs" key={order.id}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-700 truncate">
                            {formatProductNameWithOption(order.productName, order.optionName)}
                          </p>
                          <p className="text-slate-500 truncate">
                            {formatRecipientName(order.customerName, order.orderName)} · {order.address}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-medium text-slate-700">{order.quantity}개</p>
                          <p className="text-slate-500">{formatCurrency(order.price * order.quantity)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Duplicate Warning */}
          {duplicateCheck?.hasDuplicate && (
            <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-800">중복 발송 주의</p>
                  <p className="mt-1 text-sm text-amber-700">동일 주소로 {periodDays}일 이내 발송 이력이 있습니다.</p>
                </div>
              </div>

              {/* Previous Send History */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-amber-800 uppercase tracking-wide">이전 발송 이력</p>
                {duplicateCheck.duplicateLogs.slice(0, 3).map((log) => (
                  <div className="rounded-md bg-background/70 border border-amber-200 p-3 text-sm" key={log.id}>
                    <div className="flex items-center gap-2 text-amber-900">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">{formatDateTime(log.sentAt)}</span>
                      <Badge className="bg-amber-100 text-amber-700 text-xs" variant="secondary">
                        {getDaysDifference(log.sentAt)}일 전
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-start gap-2 text-amber-700">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                      <div className="text-xs">
                        {log.recipientAddresses.slice(0, 2).map((addr, idx) => (
                          <p className="truncate" key={idx}>
                            {addr}
                          </p>
                        ))}
                        {log.recipientAddresses.length > 2 && (
                          <p className="text-amber-600">외 {log.recipientAddresses.length - 2}건</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Matched Addresses */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-amber-800 uppercase tracking-wide">
                  중복 주소 ({duplicateCheck.matchedAddresses.length}건)
                </p>
                <div className="rounded-md bg-background/70 border border-amber-200 p-3">
                  <div className="text-xs text-amber-700 flex flex-col gap-1">
                    {duplicateCheck.matchedAddresses.slice(0, 3).map((addr, idx) => (
                      <p className="truncate" key={idx}>
                        {addr}
                      </p>
                    ))}
                    {duplicateCheck.matchedAddresses.length > 3 && (
                      <p className="text-amber-600">외 {duplicateCheck.matchedAddresses.length - 3}건</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Reason Input */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-amber-800">발송 사유 (필수)</label>
                <Input
                  className="border-amber-300 bg-background focus:border-amber-500 focus:ring-amber-500"
                  onChange={(e) => setDuplicateReason(e.target.value)}
                  placeholder="예: 고객 요청으로 재발송, 이전 발주 취소 후 재주문 등"
                  value={duplicateReason}
                />
                <p className="text-xs text-amber-600">입력한 사유는 발송 로그에 기록됩니다</p>
              </div>
            </div>
          )}

          {/* Email Content */}
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">메일 제목</label>
              <Input className="mt-1 bg-slate-50" readOnly value={emailSubject} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">메일 본문</label>
              <textarea
                className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                readOnly
                rows={4}
                value={emailBody}
              />
            </div>
          </div>

          {/* Error Message */}
          {sendError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                <div>
                  <p className="font-semibold text-rose-800">발송 실패</p>
                  <p className="mt-1 text-sm text-rose-700">{sendError}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 shrink-0 pt-4 border-t border-slate-100">
          <Button disabled={isSending} onClick={() => onOpenChange(false)} variant="outline">
            취소
          </Button>
          <Button
            className="gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            disabled={isSending || !canSend}
            onClick={handleSend}
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                발송 중...
              </>
            ) : duplicateCheck?.hasDuplicate ? (
              <>
                <AlertTriangle className="h-4 w-4" />
                {canSend ? '확인 후 발송' : '사유 입력 필요'}
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                발송하기
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

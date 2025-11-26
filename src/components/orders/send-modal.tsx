'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  checkDuplicateSend,
  type DuplicateCheckResult,
  duplicateCheckSettings,
  formatCurrency,
  formatDateTime,
  getDaysDifference,
  type OrderBatch,
} from '@/lib/mock-data';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Mail,
  MapPin,
  Send,
  User,
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface SendModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: OrderBatch | null;
}

export function SendModal({ open, onOpenChange, batch }: SendModalProps) {
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [duplicateReason, setDuplicateReason] = useState('');

  // 중복 체크 결과를 useMemo로 계산 (렌더링 시점에 파생)
  const duplicateCheck = useMemo<DuplicateCheckResult | null>(() => {
    if (!open || !batch || !duplicateCheckSettings.enabled) {
      return null;
    }
    const recipientAddresses = batch.orders.map((order) => order.address);
    return checkDuplicateSend(batch.manufacturerId, recipientAddresses, duplicateCheckSettings.periodDays);
  }, [open, batch]);

  if (!batch) {
    return null;
  }

  // 모달 닫힐 때 사유 초기화를 위한 핸들러
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setDuplicateReason('');
    }
    onOpenChange(newOpen);
  };

  // 중복 감지 시 사유 입력 필수
  const canSend = !duplicateCheck?.hasDuplicate || duplicateReason.trim().length > 0;

  const handleSend = async () => {
    if (!canSend) return;

    setIsSending(true);
    // Simulate sending email
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSending(false);
    setIsSent(true);

    // Auto close after success
    setTimeout(() => {
      setIsSent(false);
      setDuplicateReason('');
      handleOpenChange(false);
    }, 2000);
  };

  const emailSubject = `[다온에프앤씨 발주서]_${batch.manufacturerName}_${new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '')}`;

  const emailBody = `안녕하세요. (주)다온에프앤씨 발주 첨부파일 드립니다.\n\n감사합니다.`;

  if (isSent) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
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
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-slate-600" />
            이메일 발송
          </DialogTitle>
          <DialogDescription>아래 내용으로 발주서 이메일을 발송합니다.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-2">
          {/* Recipient */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
                <User className="h-5 w-5 text-slate-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">{batch.manufacturerName}</p>
                <p className="text-sm text-slate-500">{batch.email}</p>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
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
          </div>

          {/* Duplicate Warning */}
          {duplicateCheck?.hasDuplicate && (
            <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-800">중복 발송 주의</p>
                  <p className="mt-1 text-sm text-amber-700">
                    동일 주소로 {duplicateCheckSettings.periodDays}일 이내 발송 이력이 있습니다.
                  </p>
                </div>
              </div>

              {/* Previous Send History */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-amber-800 uppercase tracking-wide">이전 발송 이력</p>
                {duplicateCheck.duplicateLogs.slice(0, 3).map((log) => (
                  <div key={log.id} className="rounded-md bg-white/70 border border-amber-200 p-3 text-sm">
                    <div className="flex items-center gap-2 text-amber-900">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">{formatDateTime(log.sentAt)}</span>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
                        {getDaysDifference(log.sentAt)}일 전
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-start gap-2 text-amber-700">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                      <div className="text-xs">
                        {log.recipientAddresses.slice(0, 2).map((addr, idx) => (
                          <p key={idx} className="truncate">
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
              <div className="space-y-2">
                <p className="text-xs font-medium text-amber-800 uppercase tracking-wide">
                  중복 주소 ({duplicateCheck.matchedAddresses.length}건)
                </p>
                <div className="rounded-md bg-white/70 border border-amber-200 p-3">
                  <div className="text-xs text-amber-700 space-y-1">
                    {duplicateCheck.matchedAddresses.slice(0, 3).map((addr, idx) => (
                      <p key={idx} className="truncate">
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
              <div className="space-y-2">
                <label className="text-sm font-medium text-amber-800">발송 사유 (필수)</label>
                <Input
                  value={duplicateReason}
                  onChange={(e) => setDuplicateReason(e.target.value)}
                  placeholder="예: 고객 요청으로 재발송, 이전 발주 취소 후 재주문 등"
                  className="border-amber-300 bg-white focus:border-amber-500 focus:ring-amber-500"
                />
                <p className="text-xs text-amber-600">입력한 사유는 발송 로그에 기록됩니다</p>
              </div>
            </div>
          )}

          {/* Email Content */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700">메일 제목</label>
              <Input value={emailSubject} readOnly className="mt-1 bg-slate-50" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">메일 본문</label>
              <textarea
                value={emailBody}
                readOnly
                rows={4}
                className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 shrink-0 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            취소
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || !canSend}
            className="gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
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
  );
}

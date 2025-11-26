"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Mail,
  User,
  FileSpreadsheet,
  Send,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { type OrderBatch, formatCurrency } from "@/lib/mock-data";

interface SendModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: OrderBatch | null;
}

export function SendModal({ open, onOpenChange, batch }: SendModalProps) {
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  if (!batch) return null;

  const handleSend = async () => {
    setIsSending(true);
    // Simulate sending email
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSending(false);
    setIsSent(true);

    // Auto close after success
    setTimeout(() => {
      setIsSent(false);
      onOpenChange(false);
    }, 2000);
  };

  const emailSubject = `[다온에프앤씨 발주서]_${batch.manufacturerName}_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
  const emailBody = `안녕하세요. (주)다온에프앤씨 발주 첨부파일 드립니다.\n\n감사합니다.`;

  if (isSent) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              발송 완료
            </h3>
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-slate-600" />
            이메일 발송
          </DialogTitle>
          <DialogDescription>
            아래 내용으로 발주서 이메일을 발송합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
                <User className="h-5 w-5 text-slate-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">
                  {batch.manufacturerName}
                </p>
                <p className="text-sm text-slate-500">{batch.email}</p>
              </div>
              <Badge
                variant="secondary"
                className="bg-blue-100 text-blue-700"
              >
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
                [다온에프앤씨 발주서]_{batch.manufacturerName}_
                {new Date().toISOString().slice(0, 10).replace(/-/g, "")}.xlsx
              </span>
            </div>
            <Separator className="my-3" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">주문 건수</p>
                <p className="font-semibold text-slate-900">
                  {batch.totalOrders}건
                </p>
              </div>
              <div>
                <p className="text-slate-500">총 금액</p>
                <p className="font-semibold text-slate-900">
                  {formatCurrency(batch.totalAmount)}
                </p>
              </div>
            </div>
          </div>

          {/* Email Content */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700">
                메일 제목
              </label>
              <Input
                value={emailSubject}
                readOnly
                className="mt-1 bg-slate-50"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">
                메일 본문
              </label>
              <textarea
                value={emailBody}
                readOnly
                rows={4}
                className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            취소
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                발송 중...
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


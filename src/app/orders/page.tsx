'use client';

import { AppShell } from '@/components/layout';
import { OrderFilters, OrderTable, SendModal } from '@/components/orders';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { type OrderBatch, orderBatches } from '@/lib/mock-data';
import { AlertCircle, CheckCircle2, Clock, FileSpreadsheet, Mail, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export default function OrdersPage() {
  const [selectedBatch, setSelectedBatch] = useState<OrderBatch | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sendQueue, setSendQueue] = useState<OrderBatch[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);

  const handleSendEmail = (batch: OrderBatch) => {
    setSelectedBatch(batch);
    setSendQueue([batch]);
    setCurrentQueueIndex(0);
    setIsModalOpen(true);
  };

  const handleBatchSend = (batches: OrderBatch[]) => {
    if (batches.length === 0) return;
    setSendQueue(batches);
    setCurrentQueueIndex(0);
    setSelectedBatch(batches[0]);
    setIsModalOpen(true);
  };

  const handleSendAllPending = () => {
    const pendingBatchesList = orderBatches.filter((b) => b.status === 'pending');
    handleBatchSend(pendingBatchesList);
  };

  const handleModalClose = (open: boolean) => {
    if (!open) {
      // 모달이 닫힐 때, 큐에 다음 항목이 있으면 계속 진행
      if (currentQueueIndex < sendQueue.length - 1) {
        const nextIndex = currentQueueIndex + 1;
        setCurrentQueueIndex(nextIndex);
        setSelectedBatch(sendQueue[nextIndex]);
        setIsModalOpen(true);
      } else {
        setIsModalOpen(false);
        setSendQueue([]);
        setCurrentQueueIndex(0);
      }
    } else {
      setIsModalOpen(open);
    }
  };

  const handlePreview = (batch: OrderBatch) => {
    // In real app, this would open a preview modal or navigate to preview page
    console.log('Preview batch:', batch);
  };

  // Calculate summary stats
  const totalBatches = orderBatches.length;
  const pendingBatchesCount = orderBatches.filter((b) => b.status === 'pending').length;
  const sentBatches = orderBatches.filter((b) => b.status === 'sent').length;
  const errorBatches = orderBatches.filter((b) => b.status === 'error').length;

  return (
    <AppShell title="발주 생성/발송" description="제조사별 발주서를 생성하고 이메일로 발송하세요">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <FileSpreadsheet className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">전체</p>
              <p className="text-xl font-semibold text-slate-900">{totalBatches}건</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">대기중</p>
              <p className="text-xl font-semibold text-slate-900">{pendingBatchesCount}건</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">발송완료</p>
              <p className="text-xl font-semibold text-slate-900">{sentBatches}건</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50">
              <AlertCircle className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">오류</p>
              <p className="text-xl font-semibold text-slate-900">{errorBatches}건</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Row */}
      <div className="flex items-center justify-between mb-6">
        <OrderFilters />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            새로고침
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-blue-600 hover:bg-blue-700"
            disabled={pendingBatchesCount === 0}
            onClick={handleSendAllPending}
          >
            <Mail className="h-4 w-4" />
            전체 발송 ({pendingBatchesCount})
          </Button>
        </div>
      </div>

      {/* Order Table */}
      <OrderTable onSendEmail={handleSendEmail} onPreview={handlePreview} onBatchSend={handleBatchSend} />

      {/* Send Modal */}
      {sendQueue.length > 1 && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
          발송 진행: {currentQueueIndex + 1} / {sendQueue.length}
        </div>
      )}
      <SendModal open={isModalOpen} onOpenChange={handleModalClose} batch={selectedBatch} />
    </AppShell>
  );
}

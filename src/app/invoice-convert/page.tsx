'use client'

import { ArrowRight, CheckCircle2, FileInput, FileOutput, Loader2 } from 'lucide-react'
import { useState } from 'react'

import type { InvoiceConvertResult, SendLog } from '@/services/logs'

import { ConvertResult } from '@/components/invoice-convert/convert-result'
import { InvoiceDropzone } from '@/components/invoice-convert/invoice-dropzone'
import { OrderSelect } from '@/components/invoice-convert/order-select'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useSendLogs } from '@/hooks/use-logs'
import { defaultInvoiceTemplate } from '@/services/manufacturers.types'

type Step = 'result' | 'select' | 'upload'

export default function InvoiceConvertPage() {
  const [step, setStep] = useState<Step>('select')
  const [selectedLog, setSelectedLog] = useState<SendLog | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [convertResults, setConvertResults] = useState<InvoiceConvertResult[]>([])

  const { data: logs = [], isLoading: isLoadingLogs } = useSendLogs()

  const handleSelectLog = (log: SendLog) => {
    setSelectedLog(log)
  }

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
  }

  const handleClearFile = () => {
    setSelectedFile(null)
  }

  const handleConvert = async () => {
    if (!selectedLog || !selectedFile) return

    setIsProcessing(true)

    // 실제로는 여기서 파일 파싱 및 변환 수행
    // 시뮬레이션을 위해 딜레이 추가
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const results = simulateInvoiceParsing(selectedLog)
    setConvertResults(results)
    setIsProcessing(false)
    setStep('result')
  }

  const handleDownload = () => {
    // 실제로는 여기서 엑셀 파일 생성 및 다운로드
    // 시뮬레이션을 위해 alert
    const successCount = convertResults.filter((r) => r.status === 'success').length
    alert(`사방넷 송장 업로드 파일 다운로드 (${successCount}건)`)
  }

  const handleReset = () => {
    setStep('select')
    setSelectedLog(null)
    setSelectedFile(null)
    setConvertResults([])
  }

  const outputFileName = selectedLog
    ? `사방넷_송장업로드_${selectedLog.manufacturerName}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`
    : ''

  if (isLoadingLogs) {
    return (
      <AppShell description="거래처 송장 파일을 사방넷 업로드 양식으로 변환합니다" title="송장 변환">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell description="거래처 송장 파일을 사방넷 업로드 양식으로 변환합니다" title="송장 변환">
      {step === 'result' ? (
        <ConvertResult
          fileName={outputFileName}
          onDownload={handleDownload}
          onReset={handleReset}
          results={convertResults}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Progress Steps */}
          <Card className="border-slate-200 bg-card shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                      selectedLog ? 'bg-emerald-500 text-primary-foreground' : 'bg-blue-500 text-primary-foreground'
                    }`}
                  >
                    {selectedLog ? <CheckCircle2 className="h-5 w-5" /> : '1'}
                  </div>
                  <span className={`text-sm font-medium ${selectedLog ? 'text-emerald-600' : 'text-slate-900'}`}>
                    발주 선택
                  </span>
                </div>

                <ArrowRight className="h-4 w-4 text-slate-300" />

                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                      selectedFile
                        ? 'bg-emerald-500 text-primary-foreground'
                        : selectedLog
                          ? 'bg-blue-500 text-primary-foreground'
                          : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {selectedFile ? <CheckCircle2 className="h-5 w-5" /> : '2'}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      selectedFile ? 'text-emerald-600' : selectedLog ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    송장 업로드
                  </span>
                </div>

                <ArrowRight className="h-4 w-4 text-slate-300" />

                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-500">
                    3
                  </div>
                  <span className="text-sm font-medium text-slate-400">변환 결과</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Order Select */}
            <OrderSelect logs={logs} onSelect={handleSelectLog} selectedLog={selectedLog} />

            {/* Right: Invoice Upload */}
            <InvoiceDropzone
              disabled={!selectedLog}
              isProcessing={isProcessing}
              onClear={handleClearFile}
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
            />
          </div>

          {/* Template Info */}
          {selectedLog && (
            <Card className="border-slate-200 bg-slate-50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <FileInput className="h-5 w-5 text-slate-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">송장 양식 정보</p>
                    <p className="text-sm text-slate-600 mt-1">
                      {selectedLog.manufacturerName}의 송장 템플릿이 적용됩니다.
                    </p>
                    {(() => {
                      const template = defaultInvoiceTemplate // TODO: Fetch actual template async
                      return (
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="px-2 py-1 bg-card rounded border border-slate-200">
                            주문번호:{' '}
                            {template.useColumnIndex
                              ? `${template.orderNumberColumn}열`
                              : `"${template.orderNumberColumn}"`}
                          </span>
                          <span className="px-2 py-1 bg-card rounded border border-slate-200">
                            택배사:{' '}
                            {template.useColumnIndex ? `${template.courierColumn}열` : `"${template.courierColumn}"`}
                          </span>
                          <span className="px-2 py-1 bg-card rounded border border-slate-200">
                            송장번호:{' '}
                            {template.useColumnIndex
                              ? `${template.trackingNumberColumn}열`
                              : `"${template.trackingNumberColumn}"`}
                          </span>
                          <span className="px-2 py-1 bg-card rounded border border-slate-200">
                            헤더: {template.headerRow}행
                          </span>
                          <span className="px-2 py-1 bg-card rounded border border-slate-200">
                            데이터: {template.dataStartRow}행부터
                          </span>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Output Preview */}
          {selectedLog && selectedFile && (
            <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <FileOutput className="h-5 w-5 text-emerald-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-emerald-900">출력 파일 정보</p>
                    <p className="text-sm text-emerald-700 mt-1">
                      파일명: <span className="font-mono">{outputFileName}</span>
                    </p>
                    <p className="text-sm text-emerald-600 mt-1">컬럼: 사방넷주문번호, 택배사코드, 송장번호</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Convert Button */}
          <div className="flex justify-end">
            <Button
              className="bg-slate-900 hover:bg-slate-800 min-w-[160px]"
              disabled={!selectedLog || !selectedFile || isProcessing}
              onClick={handleConvert}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  변환 중...
                </>
              ) : (
                <>
                  변환 시작
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </AppShell>
  )
}

// 데모용 송장 파일 파싱 시뮬레이션
function simulateInvoiceParsing(log: SendLog): InvoiceConvertResult[] {
  // 실제로는 엑셀 파싱 후 처리
  // 여기서는 발주 로그의 주문 정보를 기반으로 시뮬레이션

  const results: InvoiceConvertResult[] = []

  // 성공 케이스 - 발주 로그의 주문 사용
  log.orders.forEach((order, idx) => {
    if (idx < log.orderCount - 2) {
      // 대부분 성공
      const courierCode = '04' // CJ대한통운 default code
      results.push({
        orderNumber: order.orderNumber,
        courierCode,
        trackingNumber: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        status: 'success',
      })
    }
  })

  // 택배사 오류 케이스 추가
  results.push({
    orderNumber: 'SB20241126099',
    courierCode: '',
    trackingNumber: '111222333444',
    status: 'courier_error',
    originalCourier: '알수없는택배',
  })

  // 주문 미매칭 케이스 추가
  results.push({
    orderNumber: 'UNKNOWN-001',
    courierCode: '',
    trackingNumber: '555666777888',
    status: 'order_not_found',
    errorMessage: '주문번호를 찾을 수 없습니다',
  })

  return results
}

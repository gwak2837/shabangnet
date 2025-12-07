'use client'

import { ArrowRight, CheckCircle2, FileInput, FileOutput, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { InvoiceConvertResultItem } from '@/services/invoice-convert'
import type { SendLog } from '@/services/logs'

import { ConvertResult } from '@/components/invoice-convert/convert-result'
import { InvoiceDropzone } from '@/components/invoice-convert/invoice-dropzone'
import { OrderSelect } from '@/components/invoice-convert/order-select'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useSendLogs } from '@/hooks/use-logs'
import { convertInvoiceFile, generateInvoiceDownload } from '@/services/invoice-convert'
import { getInvoiceTemplateOrDefault } from '@/services/manufacturers'
import { defaultInvoiceTemplate, type InvoiceTemplate } from '@/services/manufacturers.types'

type Step = 'result' | 'select' | 'upload'

export default function InvoiceConvertPage() {
  const [step, setStep] = useState<Step>('select')
  const [selectedLog, setSelectedLog] = useState<SendLog | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [convertResults, setConvertResults] = useState<InvoiceConvertResultItem[]>([])
  const [currentTemplate, setCurrentTemplate] = useState<InvoiceTemplate | null>(null)
  const [outputFileName, setOutputFileName] = useState('')

  // 다운로드 버퍼 저장용 ref
  const downloadBufferRef = useRef<Buffer | null>(null)

  const { data: logs = [], isLoading: isLoadingLogs } = useSendLogs()

  // 제조사 선택 시 템플릿 로드
  const loadTemplate = useCallback(async (manufacturerId: number) => {
    try {
      const template = await getInvoiceTemplateOrDefault(manufacturerId)
      setCurrentTemplate(template)
    } catch (error) {
      console.error('Failed to load template:', error)
      setCurrentTemplate({
        ...defaultInvoiceTemplate,
        id: 0,
        manufacturerId,
        manufacturerName: '알 수 없음',
      })
    }
  }, [])

  useEffect(() => {
    if (selectedLog?.manufacturerId !== null && selectedLog?.manufacturerId !== undefined) {
      loadTemplate(selectedLog.manufacturerId)
    }
  }, [selectedLog?.manufacturerId, loadTemplate])

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
    if (!selectedLog || !selectedFile || !currentTemplate || selectedLog.manufacturerId === null) return

    setIsProcessing(true)

    try {
      // 파일을 ArrayBuffer로 변환
      const arrayBuffer = await selectedFile.arrayBuffer()

      // 실제 변환 수행
      const result = await convertInvoiceFile({
        file: arrayBuffer,
        manufacturerId: selectedLog.manufacturerId,
        manufacturerName: selectedLog.manufacturerName,
        template: currentTemplate,
      })

      setConvertResults(result.results)
      setOutputFileName(result.fileName)
      downloadBufferRef.current = result.downloadBuffer || null

      if (!result.success && result.errors.length > 0) {
        console.error('Conversion errors:', result.errors)
      }

      setStep('result')
    } catch (error) {
      console.error('Conversion failed:', error)
      alert('변환 중 오류가 발생했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = async () => {
    const successResults = convertResults.filter((r) => r.status === 'success')
    if (successResults.length === 0) return

    try {
      // 버퍼가 이미 있으면 사용, 없으면 새로 생성
      let buffer = downloadBufferRef.current
      let fileName = outputFileName

      if (!buffer && selectedLog) {
        const result = await generateInvoiceDownload(convertResults, selectedLog.manufacturerName)
        buffer = result.buffer
        fileName = result.fileName
      }

      if (!buffer) return

      // Blob 생성 및 다운로드 (Buffer를 Uint8Array로 변환)
      const blob = new Blob([new Uint8Array(buffer)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
      alert('다운로드 중 오류가 발생했습니다.')
    }
  }

  const handleReset = () => {
    setStep('select')
    setSelectedLog(null)
    setSelectedFile(null)
    setConvertResults([])
    setCurrentTemplate(null)
    setOutputFileName('')
    downloadBufferRef.current = null
  }

  const displayFileName =
    outputFileName ||
    (selectedLog
      ? `사방넷_송장업로드_${selectedLog.manufacturerName}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`
      : '')

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
          fileName={displayFileName}
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
                    {currentTemplate && (
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-1 bg-card rounded border border-slate-200">
                          주문번호:{' '}
                          {currentTemplate.useColumnIndex
                            ? `${currentTemplate.orderNumberColumn}열`
                            : `"${currentTemplate.orderNumberColumn}"`}
                        </span>
                        <span className="px-2 py-1 bg-card rounded border border-slate-200">
                          택배사:{' '}
                          {currentTemplate.useColumnIndex
                            ? `${currentTemplate.courierColumn}열`
                            : `"${currentTemplate.courierColumn}"`}
                        </span>
                        <span className="px-2 py-1 bg-card rounded border border-slate-200">
                          송장번호:{' '}
                          {currentTemplate.useColumnIndex
                            ? `${currentTemplate.trackingNumberColumn}열`
                            : `"${currentTemplate.trackingNumberColumn}"`}
                        </span>
                        <span className="px-2 py-1 bg-card rounded border border-slate-200">
                          헤더: {currentTemplate.headerRow}행
                        </span>
                        <span className="px-2 py-1 bg-card rounded border border-slate-200">
                          데이터: {currentTemplate.dataStartRow}행부터
                        </span>
                      </div>
                    )}
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
                      파일명: <span className="font-mono">{displayFileName}</span>
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

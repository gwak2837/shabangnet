'use client'

import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'

import type { Manufacturer } from '@/services/db/manufacturers'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { downloadExcel, parseExcelToJson } from '@/lib/excel-client'

interface BulkUploadData {
  manufacturerId: string | null
  manufacturerName: string
  message?: string
  optionName: string
  productCode: string
  productName: string
  status: 'error' | 'manufacturer_not_found' | 'success'
}

interface BulkUploadModalProps {
  manufacturers: Manufacturer[]
  onOpenChange: (open: boolean) => void
  onUpload: (data: BulkUploadData[]) => void
  open: boolean
}

export function BulkUploadModal({ open, onOpenChange, onUpload, manufacturers }: BulkUploadModalProps) {
  const [uploadedData, setUploadedData] = useState<BulkUploadData[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  // 제조사명으로 제조사 ID 찾기
  const findManufacturerId = useCallback(
    (manufacturerName: string): { id: string | null; status: BulkUploadData['status'] } => {
      if (!manufacturerName || manufacturerName.trim() === '') {
        return { id: null, status: 'success' } // 제조사명이 비어있으면 미지정으로 처리
      }

      const manufacturer = manufacturers.find(
        (m) => m.name.toLowerCase().trim() === manufacturerName.toLowerCase().trim(),
      )

      if (manufacturer) {
        return { id: manufacturer.id, status: 'success' }
      }

      return { id: null, status: 'manufacturer_not_found' }
    },
    [manufacturers],
  )

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      setFileName(file.name)
      setIsProcessing(true)

      try {
        // Parse Excel file
        const jsonData = await parseExcelToJson<{
          상품코드?: string
          productCode?: string
          상품명?: string
          productName?: string
          옵션명?: string
          optionName?: string
          제조사명?: string
          manufacturerName?: string
        }>(file)

        // Transform data
        const parsedData: BulkUploadData[] = jsonData.map((row) => {
          const productCode = row['상품코드'] || row['productCode'] || ''
          const productName = row['상품명'] || row['productName'] || ''
          const optionName = row['옵션명'] || row['optionName'] || ''
          const manufacturerName = row['제조사명'] || row['manufacturerName'] || ''

          if (!productCode) {
            return {
              productCode: '',
              productName: '',
              optionName: '',
              manufacturerId: null,
              manufacturerName: '',
              status: 'error' as const,
              message: '상품코드가 없습니다',
            }
          }

          const { id, status } = findManufacturerId(String(manufacturerName))

          return {
            productCode: String(productCode),
            productName: String(productName),
            optionName: String(optionName),
            manufacturerId: id,
            manufacturerName: String(manufacturerName),
            status,
            message:
              status === 'manufacturer_not_found' ? `제조사 "${manufacturerName}"을(를) 찾을 수 없습니다` : undefined,
          }
        })

        setUploadedData(parsedData.filter((item) => item.productCode))
      } catch (error) {
        console.error('Error parsing Excel:', error)
        setUploadedData([])
      } finally {
        setIsProcessing(false)
      }
    },
    [findManufacturerId],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
  })

  const handleDownloadTemplate = async () => {
    const templateData = [
      { 상품코드: 'NS-001', 상품명: '신라면 멀티팩', 옵션명: '5개입', 제조사명: '농심식품' },
      { 상품코드: 'CJ-101', 상품명: '햇반 210g', 옵션명: '12개입', 제조사명: 'CJ제일제당' },
      { 상품코드: 'OT-201', 상품명: '진라면 순한맛', 옵션명: '5개입', 제조사명: '오뚜기' },
    ]
    await downloadExcel(templateData, {
      fileName: '상품_제조사_매핑_템플릿.xlsx',
      sheetName: '상품매핑',
      columnWidths: [15, 30, 20, 15],
    })
  }

  const handleApply = () => {
    const validData = uploadedData.filter((item) => item.status === 'success')
    onUpload(validData)
    handleClose()
  }

  const handleClose = () => {
    setUploadedData([])
    setFileName(null)
    onOpenChange(false)
  }

  const successCount = uploadedData.filter((d) => d.status === 'success').length
  const errorCount = uploadedData.filter((d) => d.status === 'error').length
  const notFoundCount = uploadedData.filter((d) => d.status === 'manufacturer_not_found').length

  return (
    <Dialog onOpenChange={handleClose} open={open}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            상품-제조사 매핑 일괄 업로드
          </DialogTitle>
          <DialogDescription>엑셀 파일(.xlsx)을 업로드하여 상품과 제조사 매핑을 일괄 등록합니다.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Template Download */}
          <Button className="gap-2" onClick={handleDownloadTemplate} size="sm" variant="outline">
            <Download className="h-4 w-4" />
            템플릿 다운로드
          </Button>

          {/* Dropzone */}
          {!fileName && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input {...getInputProps()} />
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-slate-400" />
              {isDragActive ? (
                <p className="text-blue-600 font-medium">파일을 여기에 놓으세요</p>
              ) : (
                <div>
                  <p className="text-slate-600 font-medium mb-1">엑셀 파일을 드래그하거나 클릭하여 선택</p>
                  <p className="text-sm text-slate-400">파일 형식: .xlsx, .xls</p>
                  <p className="text-sm text-slate-400 mt-2">필수 컬럼: 상품코드, 상품명, 옵션명, 제조사명</p>
                </div>
              )}
            </div>
          )}

          {/* File Info */}
          {fileName && (
            <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                <span className="font-medium text-slate-700">{fileName}</span>
              </div>
              <Button
                onClick={() => {
                  setFileName(null)
                  setUploadedData([])
                }}
                size="sm"
                variant="ghost"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Processing */}
          {isProcessing && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          )}

          {/* Preview */}
          {uploadedData.length > 0 && !isProcessing && (
            <div className="space-y-3">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  성공: {successCount}건
                </span>
                {notFoundCount > 0 && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    제조사 미등록: {notFoundCount}건
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="flex items-center gap-1 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    오류: {errorCount}건
                  </span>
                )}
              </div>

              {notFoundCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                  <p className="font-medium mb-1">제조사 미등록 안내</p>
                  <p>
                    엑셀에 입력된 제조사명이 시스템에 등록되어 있지 않습니다. 먼저 제조사 관리 페이지에서 제조사를
                    등록해주세요.
                  </p>
                </div>
              )}

              <div className="border rounded-lg max-h-64 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">상품코드</TableHead>
                      <TableHead className="text-xs">상품명</TableHead>
                      <TableHead className="text-xs">옵션명</TableHead>
                      <TableHead className="text-xs">제조사명</TableHead>
                      <TableHead className="text-xs">상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadedData.slice(0, 50).map((item, index) => (
                      <TableRow className={item.status !== 'success' ? 'bg-amber-50/50' : ''} key={index}>
                        <TableCell className="font-mono text-sm">{item.productCode}</TableCell>
                        <TableCell className="text-sm">{item.productName}</TableCell>
                        <TableCell className="text-sm">{item.optionName || '-'}</TableCell>
                        <TableCell className="text-sm">{item.manufacturerName || '-'}</TableCell>
                        <TableCell>
                          {item.status === 'success' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : item.status === 'manufacturer_not_found' ? (
                            <div className="flex items-center gap-1 text-amber-600">
                              <AlertCircle className="h-4 w-4" />
                              <span className="text-xs">미등록</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-red-500">
                              <AlertCircle className="h-4 w-4" />
                              <span className="text-xs">{item.message}</span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {uploadedData.length > 50 && (
                  <p className="text-center text-sm text-slate-500 py-2">외 {uploadedData.length - 50}건 더 있음</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button onClick={handleClose} variant="outline">
            취소
          </Button>
          <Button className="gap-2" disabled={successCount === 0} onClick={handleApply}>
            <CheckCircle2 className="h-4 w-4" />
            {successCount}건 적용
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

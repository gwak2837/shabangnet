'use client'

import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { downloadExcel, parseExcelToJson } from '@/lib/excel-client'
import { formatCurrency } from '@/lib/mock-data'

interface CostUploadData {
  cost: number
  message?: string
  productCode: string
  productName: string
  shippingFee: number
  status: 'error' | 'not_found' | 'success'
}

interface CostUploadModalProps {
  onOpenChange: (open: boolean) => void
  onUpload: (data: CostUploadData[]) => void
  open: boolean
}

export function CostUploadModal({ open, onOpenChange, onUpload }: CostUploadModalProps) {
  const [uploadedData, setUploadedData] = useState<CostUploadData[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
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
        원가?: number
        cost?: number
        택배비?: number
        shippingFee?: number
      }>(file)

      // Transform data
      const parsedData: CostUploadData[] = jsonData
        .map((row) => {
          const productCode = row['상품코드'] || row['productCode'] || ''
          const productName = row['상품명'] || row['productName'] || ''
          const cost = row['원가'] || row['cost'] || 0
          const shippingFee = row['택배비'] || row['shippingFee'] || 0

          if (!productCode) {
            return {
              productCode: '',
              productName: '',
              cost: 0,
              shippingFee: 0,
              status: 'error' as const,
              message: '상품코드가 없습니다',
            }
          }

          return {
            productCode: String(productCode),
            productName: String(productName),
            cost: Number(cost) || 0,
            shippingFee: Number(shippingFee) || 0,
            status: 'success' as const,
          }
        })
        .filter((item) => item.productCode)

      setUploadedData(parsedData)
    } catch (error) {
      console.error('Error parsing Excel:', error)
      setUploadedData([])
    } finally {
      setIsProcessing(false)
    }
  }, [])

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
      { 상품코드: 'NS-001', 상품명: '', 원가: 5500, 택배비: '' },
      { 상품코드: 'CJ-101', 상품명: '', 원가: 11000, 택배비: '' },
      { 상품코드: 'OT-201', 상품명: '', 원가: 3100, 택배비: '' },
    ]
    await downloadExcel(templateData, {
      fileName: '원가_일괄등록_템플릿.xlsx',
      sheetName: '원가등록',
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

  return (
    <Dialog onOpenChange={handleClose} open={open}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            원가 일괄 업로드
          </DialogTitle>
          <DialogDescription>엑셀 파일(.xlsx)을 업로드하여 상품 원가를 일괄 등록합니다.</DialogDescription>
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
                {errorCount > 0 && (
                  <span className="flex items-center gap-1 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    오류: {errorCount}건
                  </span>
                )}
              </div>

              <div className="border rounded-lg max-h-64 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">상품코드</TableHead>
                      <TableHead className="text-xs">상품명</TableHead>
                      <TableHead className="text-xs text-right">원가</TableHead>
                      <TableHead className="text-xs text-right">택배비</TableHead>
                      <TableHead className="text-xs">상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadedData.slice(0, 50).map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">{item.productCode}</TableCell>
                        <TableCell className="text-sm">{item.productName}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.cost)}</TableCell>
                        <TableCell className="text-right">{item.shippingFee ? formatCurrency(item.shippingFee) : '-'}</TableCell>
                        <TableCell>
                          {item.status === 'success' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
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

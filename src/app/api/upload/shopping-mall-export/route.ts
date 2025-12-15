import { eq } from 'drizzle-orm'
import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db/client'
import { upload } from '@/db/schema/orders'
import { shoppingMallTemplate } from '@/db/schema/settings'
import { formatDateForFileName } from '@/lib/excel'

const bodySchema = z.object({
  uploadId: z.coerce.number({ message: '업로드 ID가 필요해요' }).int().min(1, '업로드 ID가 필요해요'),
})

const exportConfigSchema = z.object({
  version: z.literal(1),
  copyPrefixRows: z.boolean().optional(),
  columns: z
    .array(
      z.object({
        header: z.string().optional(),
        source: z.discriminatedUnion('type', [
          z.object({ type: z.literal('input'), columnIndex: z.number().int().min(1) }),
          z.object({ type: z.literal('const'), value: z.string() }),
        ]),
      }),
    )
    .min(1),
})

const sourceSnapshotSchema = z.object({
  version: z.literal(1),
  sheetName: z.string(),
  totalRows: z.number().int(),
  columnCount: z.number().int().min(1),
  headerRow: z.number().int().min(1),
  dataStartRow: z.number().int().min(1),
  prefixRows: z.array(z.array(z.string())),
  headerCells: z.array(z.string()),
  dataRows: z.array(
    z.object({
      rowNumber: z.number().int().min(1),
      cells: z.array(z.string()),
    }),
  ),
})

type ExportConfig = z.infer<typeof exportConfigSchema>
type SourceSnapshot = z.infer<typeof sourceSnapshotSchema>

/**
 * 쇼핑몰 업로드 결과 다운로드
 * - 업로드 당시 저장된 원본 스냅샷 + 쇼핑몰별 exportConfig로 엑셀 생성
 * - 파싱 오류 행은 스냅샷에 저장되지 않으므로 자동 제외
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsedBody = bodySchema.safeParse(body)

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message ?? '유효하지 않은 요청이에요' },
        { status: 400 },
      )
    }

    const { uploadId } = parsedBody.data

    const [uploadRecord] = await db
      .select({
        id: upload.id,
        fileType: upload.fileType,
        shoppingMallId: upload.shoppingMallId,
        sourceSnapshot: upload.sourceSnapshot,
        uploadedAt: upload.uploadedAt,
      })
      .from(upload)
      .where(eq(upload.id, uploadId))

    if (!uploadRecord) {
      return NextResponse.json({ error: '업로드 기록이 없어요' }, { status: 404 })
    }

    if (uploadRecord.fileType !== 'shopping_mall') {
      return NextResponse.json({ error: '쇼핑몰 업로드만 다운로드할 수 있어요' }, { status: 400 })
    }

    if (!uploadRecord.shoppingMallId) {
      return NextResponse.json({ error: '쇼핑몰 정보가 없어요' }, { status: 400 })
    }

    if (!uploadRecord.sourceSnapshot) {
      return NextResponse.json({ error: '재다운로드를 위한 데이터가 없어요' }, { status: 400 })
    }

    const [template] = await db
      .select({
        displayName: shoppingMallTemplate.displayName,
        exportConfig: shoppingMallTemplate.exportConfig,
      })
      .from(shoppingMallTemplate)
      .where(eq(shoppingMallTemplate.id, uploadRecord.shoppingMallId))

    if (!template) {
      return NextResponse.json({ error: '쇼핑몰 템플릿을 찾을 수 없어요' }, { status: 404 })
    }

    if (!template.exportConfig) {
      return NextResponse.json({ error: '다운로드 템플릿이 등록되지 않았어요' }, { status: 400 })
    }

    const snapshotJson: unknown = JSON.parse(uploadRecord.sourceSnapshot)
    const exportConfigJson: unknown = JSON.parse(template.exportConfig)

    const parsedSnapshot = sourceSnapshotSchema.safeParse(snapshotJson)
    if (!parsedSnapshot.success) {
      return NextResponse.json({ error: '저장된 업로드 데이터 형식이 올바르지 않아요' }, { status: 500 })
    }

    const parsedExportConfig = exportConfigSchema.safeParse(exportConfigJson)
    if (!parsedExportConfig.success) {
      return NextResponse.json({ error: '다운로드 템플릿 형식이 올바르지 않아요' }, { status: 500 })
    }

    const snapshot: SourceSnapshot = parsedSnapshot.data
    const exportConfig: ExportConfig = parsedExportConfig.data

    const workbook = new ExcelJS.Workbook()
    workbook.creator = '(주)다온에프앤씨'
    workbook.created = new Date()

    const worksheet = workbook.addWorksheet(snapshot.sheetName || '변환결과')
    const outputColumns = exportConfig.columns
    const copyPrefixRows = exportConfig.copyPrefixRows ?? true

    if (copyPrefixRows) {
      for (const prefixRowCells of snapshot.prefixRows) {
        const rowValues = outputColumns.map((col) => getCellValueFromSource(col.source, prefixRowCells))
        worksheet.addRow(rowValues)
      }
    }

    // Header row
    const headerValues = outputColumns.map((col) => {
      if (col.header !== undefined) {
        return col.header
      }
      if (col.source.type === 'input') {
        return snapshot.headerCells[col.source.columnIndex - 1] ?? ''
      }
      return ''
    })
    const headerRow = worksheet.addRow(headerValues)
    headerRow.font = { bold: true }

    // Data rows (valid rows only)
    for (const dataRow of snapshot.dataRows) {
      const rowValues = outputColumns.map((col) => getCellValueFromSource(col.source, dataRow.cells))
      worksheet.addRow(rowValues)
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const fileName = encodeURIComponent(`${template.displayName}_${formatDateForFileName(uploadRecord.uploadedAt)}.xlsx`)

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('Shopping mall export error:', error)
    const message = error instanceof Error ? error.message : '다운로드 중 오류가 발생했어요'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function getCellValueFromSource(source: ExportConfig['columns'][number]['source'], rowCells: string[]): string {
  if (source.type === 'const') {
    return source.value
  }

  const idx = source.columnIndex - 1
  return rowCells[idx] ?? ''
}

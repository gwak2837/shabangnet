export type ManufacturerExcelImportResult =
  | {
      created: number
      errors: ManufacturerExcelRowError[]
      skipped: number
      success: true
      totalRows: number
      updated: number
    }
  | {
      error: string
    }

export interface ManufacturerExcelRowError {
  message: string
  name?: string
  row: number
}

export const MANUFACTURER_EXCEL_HEADER = ['제조사명', '담당자명', '이메일', '휴대전화번호'] as const

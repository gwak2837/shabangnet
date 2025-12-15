export type ManufacturerCsvImportResult =
  | {
      created: number
      errors: ManufacturerCsvRowError[]
      skipped: number
      success: true
      totalRows: number
      updated: number
    }
  | {
      error: string
    }

export interface ManufacturerCsvRowError {
  message: string
  name?: string
  row: number
}

export const MANUFACTURER_CSV_HEADER = ['제조사명', '담당자명', '이메일', 'CC이메일', '휴대전화번호'] as const

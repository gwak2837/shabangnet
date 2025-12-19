export const OPTION_MAPPING_CSV_HEADER = ['상품코드', '옵션명', '제조사명'] as const

export type OptionMappingCsvImportResult =
  | {
      error: string
    }
  | {
      success: true
      created: number
      errors: OptionMappingCsvRowError[]
      skipped: number
      totalRows: number
      updated: number
    }

export interface OptionMappingCsvRowError {
  manufacturerName?: string
  message: string
  optionName?: string
  productCode?: string
  row: number
}

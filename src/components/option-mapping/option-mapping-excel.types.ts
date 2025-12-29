export const OPTION_MAPPING_EXCEL_HEADER = ['상품코드', '옵션명', '제조사명'] as const

export type OptionMappingExcelImportResult =
  | {
      error: string
    }
  | {
      success: true
      created: number
      errors: OptionMappingExcelRowError[]
      skipped: number
      totalRows: number
      updated: number
    }

export interface OptionMappingExcelRowError {
  manufacturerName?: string
  message: string
  optionName?: string
  productCode?: string
  row: number
}



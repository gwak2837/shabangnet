export type ProductExcelImportResult =
  | {
      created: number
      errors: ProductExcelRowError[]
      skipped: number
      success: true
      totalRows: number
      updated: number
    }
  | {
      error: string
    }

export interface ProductExcelRowError {
  message: string
  productCode?: string
  row: number
}

export const PRODUCT_EXCEL_HEADER = ['상품코드', '상품명', '옵션명', '제조사명', '판매가', '원가', '배송비'] as const



export interface CommonOrderTemplate {
  columnMappings: Record<string, string>
  dataStartRow: number
  fixedValues?: Record<string, string>
  headerRow: number
  key: string
  templateFileName: string
}

export interface UpsertCommonOrderTemplateInput {
  columnMappings: Record<string, string>
  dataStartRow: number
  fixedValues?: Record<string, string>
  headerRow: number
  templateFileBuffer?: ArrayBuffer
  templateFileName?: string
}

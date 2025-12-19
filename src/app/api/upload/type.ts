export interface LookupMaps {
  manufacturerMap: Map<string, ManufacturerInfo>
  optionMap: Map<string, OptionMappingInfo>
  productMap: Map<string, ProductInfo>
}

export interface ManufacturerBreakdown {
  amount: number
  marginRate: number | null
  name: string
  orders: number
  productCount: number
  totalCost: number
  totalQuantity: number
}

export interface ManufacturerInfo {
  id: number
  name: string
}

export interface OptionMappingInfo {
  manufacturerId: number | null
  optionName: string
  productCode: string
}

export interface ProductInfo {
  manufacturerId: number | null
  productCode: string
}

export interface UploadError {
  message: string
  productCode?: string
  productName?: string
  row: number
}

export interface UploadSummary {
  estimatedMargin: number | null
  totalAmount: number
  totalCost: number
}

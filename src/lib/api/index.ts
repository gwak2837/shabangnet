import * as manufacturers from './manufacturers'
import * as products from './products'
import * as orders from './orders'
import * as logs from './logs'
import * as optionMappings from './option-mappings'
import * as dashboard from './dashboard'
import * as settings from './settings'

export const api = {
  manufacturers,
  products,
  orders,
  logs,
  optionMappings,
  dashboard,
  settings,
}

export type { SendOrdersParams, SendOrdersResult } from './orders'
export type { LogFilters } from './logs'
export type { ChartDataItem } from './dashboard'


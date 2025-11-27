import * as dashboard from './dashboard'
import * as logs from './logs'
import * as manufacturers from './manufacturers'
import * as optionMappings from './option-mappings'
import * as orders from './orders'
import * as products from './products'
import * as settings from './settings'
import * as settlement from './settlement'

export const api = {
  manufacturers,
  products,
  orders,
  logs,
  optionMappings,
  dashboard,
  settings,
  settlement,
}

export type { ChartDataItem } from './dashboard'
export type { LogFilters } from './logs'
export type { SendOrdersParams, SendOrdersResult } from './orders'
export type { SettlementData, SettlementFilters, SettlementOrderItem, SettlementSummary } from './settlement'

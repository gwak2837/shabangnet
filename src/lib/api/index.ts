import * as manufacturers from './manufacturers'
import * as products from './products'
import * as orders from './orders'
import * as logs from './logs'
import * as optionMappings from './option-mappings'
import * as dashboard from './dashboard'
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

export type { SendOrdersParams, SendOrdersResult } from './orders'
export type { LogFilters } from './logs'
export type { ChartDataItem } from './dashboard'
export type { SettlementFilters, SettlementData, SettlementOrderItem, SettlementSummary } from './settlement'

import { account, passkey, session, twoFactor, user, verification } from './auth'
import { invoiceTemplate, manufacturer, optionMapping, orderTemplate, product } from './manufacturers'
import { order, orderEmailLog, orderEmailLogItem, upload } from './orders'
import {
  courierMapping,
  emailTemplate,
  exclusionPattern,
  settings,
  shoppingMallTemplate,
  smtpAccount,
} from './settings'

export type Account = typeof account.$inferSelect
export type CourierMapping = typeof courierMapping.$inferSelect
export type EmailTemplate = typeof emailTemplate.$inferSelect
export type ExclusionPattern = typeof exclusionPattern.$inferSelect
export type InvoiceTemplate = typeof invoiceTemplate.$inferSelect
export type Manufacturer = typeof manufacturer.$inferSelect
export type NewAccount = typeof account.$inferInsert
export type NewCourierMapping = typeof courierMapping.$inferInsert
export type NewEmailTemplate = typeof emailTemplate.$inferInsert
export type NewExclusionPattern = typeof exclusionPattern.$inferInsert
export type NewInvoiceTemplate = typeof invoiceTemplate.$inferInsert
export type NewManufacturer = typeof manufacturer.$inferInsert
export type NewOptionMapping = typeof optionMapping.$inferInsert
export type NewOrder = typeof order.$inferInsert
export type NewOrderEmailLog = typeof orderEmailLog.$inferInsert
export type NewOrderEmailLogItem = typeof orderEmailLogItem.$inferInsert
export type NewOrderTemplate = typeof orderTemplate.$inferInsert
export type NewPasskey = typeof passkey.$inferInsert
export type NewProduct = typeof product.$inferInsert
export type NewSession = typeof session.$inferInsert
export type NewSetting = typeof settings.$inferInsert
export type NewShoppingMallTemplate = typeof shoppingMallTemplate.$inferInsert
export type NewSmtpAccount = typeof smtpAccount.$inferInsert
export type NewTwoFactor = typeof twoFactor.$inferInsert
export type NewUpload = typeof upload.$inferInsert
export type NewUser = typeof user.$inferInsert
export type NewVerification = typeof verification.$inferInsert
export type OptionMapping = typeof optionMapping.$inferSelect
export type Order = typeof order.$inferSelect
export type OrderEmailLog = typeof orderEmailLog.$inferSelect
export type OrderEmailLogItem = typeof orderEmailLogItem.$inferSelect
export type OrderTemplate = typeof orderTemplate.$inferSelect
export type Passkey = typeof passkey.$inferSelect
export type Product = typeof product.$inferSelect
export type Session = typeof session.$inferSelect
export type Setting = typeof settings.$inferSelect
export type ShoppingMallTemplate = typeof shoppingMallTemplate.$inferSelect
export type SmtpAccount = typeof smtpAccount.$inferSelect
export type TwoFactor = typeof twoFactor.$inferSelect
export type Upload = typeof upload.$inferSelect
export type User = typeof user.$inferSelect
export type Verification = typeof verification.$inferSelect

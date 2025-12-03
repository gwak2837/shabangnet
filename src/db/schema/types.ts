import { account, passkey, session, twoFactor, user, verification } from './auth'
import { invoiceTemplates, manufacturers, optionMappings, orderTemplates, products } from './manufacturers'
import { emailLogOrders, emailLogs, orders, uploads } from './orders'
import { courierMappings, exclusionPatterns, settings, shoppingMallTemplates } from './settings'

export type Account = typeof account.$inferSelect
export type CourierMapping = typeof courierMappings.$inferSelect
export type EmailLog = typeof emailLogs.$inferSelect
export type EmailLogOrder = typeof emailLogOrders.$inferSelect
export type ExclusionPattern = typeof exclusionPatterns.$inferSelect
export type InvoiceTemplate = typeof invoiceTemplates.$inferSelect
export type Manufacturer = typeof manufacturers.$inferSelect
export type NewAccount = typeof account.$inferInsert
export type NewCourierMapping = typeof courierMappings.$inferInsert
export type NewEmailLog = typeof emailLogs.$inferInsert
export type NewEmailLogOrder = typeof emailLogOrders.$inferInsert
export type NewExclusionPattern = typeof exclusionPatterns.$inferInsert
export type NewInvoiceTemplate = typeof invoiceTemplates.$inferInsert
export type NewManufacturer = typeof manufacturers.$inferInsert
export type NewOptionMapping = typeof optionMappings.$inferInsert
export type NewOrder = typeof orders.$inferInsert
export type NewOrderTemplate = typeof orderTemplates.$inferInsert
export type NewPasskey = typeof passkey.$inferInsert
export type NewProduct = typeof products.$inferInsert
export type NewSession = typeof session.$inferInsert
export type NewSetting = typeof settings.$inferInsert
export type NewShoppingMallTemplate = typeof shoppingMallTemplates.$inferInsert
export type NewTwoFactor = typeof twoFactor.$inferInsert
export type NewUpload = typeof uploads.$inferInsert
export type NewUser = typeof user.$inferInsert
export type NewVerification = typeof verification.$inferInsert
export type OptionMapping = typeof optionMappings.$inferSelect
export type Order = typeof orders.$inferSelect
export type OrderTemplate = typeof orderTemplates.$inferSelect
export type Passkey = typeof passkey.$inferSelect
export type Product = typeof products.$inferSelect
export type Session = typeof session.$inferSelect
export type Setting = typeof settings.$inferSelect
export type ShoppingMallTemplate = typeof shoppingMallTemplates.$inferSelect
export type TwoFactor = typeof twoFactor.$inferSelect
export type Upload = typeof uploads.$inferSelect
export type User = typeof user.$inferSelect
export type Verification = typeof verification.$inferSelect

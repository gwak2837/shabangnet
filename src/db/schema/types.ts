import {
  accountLocks,
  accounts,
  loginAttempts,
  passwordResetTokens,
  roles,
  sessions,
  users,
  usersToRoles,
  verificationTokens,
} from './auth'
import { invoiceTemplates, manufacturers, optionMappings, orderTemplates, products } from './manufacturers'
import { emailLogOrders, emailLogs, orders, uploads } from './orders'
import { courierMappings, exclusionPatterns, settings, shoppingMallTemplates } from './settings'

export type Account = typeof accounts.$inferSelect
export type AccountLock = typeof accountLocks.$inferSelect

export type CourierMapping = typeof courierMappings.$inferSelect
export type EmailLog = typeof emailLogs.$inferSelect

export type EmailLogOrder = typeof emailLogOrders.$inferSelect
export type ExclusionPattern = typeof exclusionPatterns.$inferSelect

export type InvoiceTemplate = typeof invoiceTemplates.$inferSelect
export type LoginAttempt = typeof loginAttempts.$inferSelect

export type Manufacturer = typeof manufacturers.$inferSelect
export type NewAccount = typeof accounts.$inferInsert

export type NewAccountLock = typeof accountLocks.$inferInsert
export type NewCourierMapping = typeof courierMappings.$inferInsert

export type NewEmailLog = typeof emailLogs.$inferInsert
export type NewEmailLogOrder = typeof emailLogOrders.$inferInsert

export type NewExclusionPattern = typeof exclusionPatterns.$inferInsert
export type NewInvoiceTemplate = typeof invoiceTemplates.$inferInsert

export type NewLoginAttempt = typeof loginAttempts.$inferInsert
export type NewManufacturer = typeof manufacturers.$inferInsert

export type NewOptionMapping = typeof optionMappings.$inferInsert
export type NewOrder = typeof orders.$inferInsert

export type NewOrderTemplate = typeof orderTemplates.$inferInsert
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert

export type NewProduct = typeof products.$inferInsert
export type NewRole = typeof roles.$inferInsert

export type NewSession = typeof sessions.$inferInsert
export type NewSetting = typeof settings.$inferInsert

export type NewShoppingMallTemplate = typeof shoppingMallTemplates.$inferInsert
export type NewUpload = typeof uploads.$inferInsert

export type NewUser = typeof users.$inferInsert
export type NewUserToRole = typeof usersToRoles.$inferInsert

export type NewVerificationToken = typeof verificationTokens.$inferInsert
export type OptionMapping = typeof optionMappings.$inferSelect

export type Order = typeof orders.$inferSelect
export type OrderTemplate = typeof orderTemplates.$inferSelect

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect
export type Product = typeof products.$inferSelect

export type Role = typeof roles.$inferSelect
export type Session = typeof sessions.$inferSelect

export type Setting = typeof settings.$inferSelect
export type ShoppingMallTemplate = typeof shoppingMallTemplates.$inferSelect

export type Upload = typeof uploads.$inferSelect
export type User = typeof users.$inferSelect

export type UserToRole = typeof usersToRoles.$inferSelect
export type VerificationToken = typeof verificationTokens.$inferSelect

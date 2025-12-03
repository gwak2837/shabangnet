import { relations } from 'drizzle-orm'
import 'server-only'

import { account, passkey, session, twoFactor, user } from './auth'
import { invoiceTemplates, manufacturers, optionMappings, orderTemplates, products } from './manufacturers'
import { emailLogOrders, emailLogs, orders, uploads } from './orders'
import { shoppingMallTemplates } from './settings'

// ============================================
// Auth Relations
// ============================================

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  twoFactors: many(twoFactor),
  passkeys: many(passkey),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}))

export const twoFactorRelations = relations(twoFactor, ({ one }) => ({
  user: one(user, {
    fields: [twoFactor.userId],
    references: [user.id],
  }),
}))

export const passkeyRelations = relations(passkey, ({ one }) => ({
  user: one(user, {
    fields: [passkey.userId],
    references: [user.id],
  }),
}))

// ============================================
// Manufacturers Relations
// ============================================

export const manufacturersRelations = relations(manufacturers, ({ many, one }) => ({
  products: many(products),
  optionMappings: many(optionMappings),
  emailLogs: many(emailLogs),
  invoiceTemplate: many(invoiceTemplates),
  orderTemplate: one(orderTemplates),
  orders: many(orders),
}))

export const productsRelations = relations(products, ({ one }) => ({
  manufacturer: one(manufacturers, {
    fields: [products.manufacturerId],
    references: [manufacturers.id],
  }),
}))

export const optionMappingsRelations = relations(optionMappings, ({ one }) => ({
  manufacturer: one(manufacturers, {
    fields: [optionMappings.manufacturerId],
    references: [manufacturers.id],
  }),
}))

export const invoiceTemplatesRelations = relations(invoiceTemplates, ({ one }) => ({
  manufacturer: one(manufacturers, {
    fields: [invoiceTemplates.manufacturerId],
    references: [manufacturers.id],
  }),
}))

export const orderTemplatesRelations = relations(orderTemplates, ({ one }) => ({
  manufacturer: one(manufacturers, {
    fields: [orderTemplates.manufacturerId],
    references: [manufacturers.id],
  }),
}))

// ============================================
// Settings Relations
// ============================================

export const shoppingMallTemplatesRelations = relations(shoppingMallTemplates, ({ many }) => ({
  uploads: many(uploads),
}))

// ============================================
// Orders Relations
// ============================================

export const uploadsRelations = relations(uploads, ({ one, many }) => ({
  shoppingMallTemplate: one(shoppingMallTemplates, {
    fields: [uploads.shoppingMallId],
    references: [shoppingMallTemplates.id],
  }),
  orders: many(orders),
}))

export const ordersRelations = relations(orders, ({ one }) => ({
  upload: one(uploads, {
    fields: [orders.uploadId],
    references: [uploads.id],
  }),
  manufacturer: one(manufacturers, {
    fields: [orders.manufacturerId],
    references: [manufacturers.id],
  }),
}))

export const emailLogsRelations = relations(emailLogs, ({ one, many }) => ({
  manufacturer: one(manufacturers, {
    fields: [emailLogs.manufacturerId],
    references: [manufacturers.id],
  }),
  orders: many(emailLogOrders),
}))

export const emailLogOrdersRelations = relations(emailLogOrders, ({ one }) => ({
  emailLog: one(emailLogs, {
    fields: [emailLogOrders.emailLogId],
    references: [emailLogs.id],
  }),
}))

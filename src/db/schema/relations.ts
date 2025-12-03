import { relations } from 'drizzle-orm'
import 'server-only'

import { account, passkey, session, twoFactor, user } from './auth'
import { invoiceTemplate, manufacturer, optionMapping, orderTemplate, product } from './manufacturers'
import { order, orderEmailLog, orderEmailLogItem, upload } from './orders'
import { shoppingMallTemplate } from './settings'

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
// Manufacturer Relations
// ============================================

export const manufacturerRelations = relations(manufacturer, ({ many, one }) => ({
  products: many(product),
  optionMappings: many(optionMapping),
  orderEmailLogs: many(orderEmailLog),
  invoiceTemplates: many(invoiceTemplate),
  orderTemplate: one(orderTemplate),
  orders: many(order),
}))

export const productRelations = relations(product, ({ one }) => ({
  manufacturer: one(manufacturer, {
    fields: [product.manufacturerId],
    references: [manufacturer.id],
  }),
}))

export const optionMappingRelations = relations(optionMapping, ({ one }) => ({
  manufacturer: one(manufacturer, {
    fields: [optionMapping.manufacturerId],
    references: [manufacturer.id],
  }),
}))

export const invoiceTemplateRelations = relations(invoiceTemplate, ({ one }) => ({
  manufacturer: one(manufacturer, {
    fields: [invoiceTemplate.manufacturerId],
    references: [manufacturer.id],
  }),
}))

export const orderTemplateRelations = relations(orderTemplate, ({ one }) => ({
  manufacturer: one(manufacturer, {
    fields: [orderTemplate.manufacturerId],
    references: [manufacturer.id],
  }),
}))

// ============================================
// Settings Relations
// ============================================

export const shoppingMallTemplateRelations = relations(shoppingMallTemplate, ({ many }) => ({
  uploads: many(upload),
}))

// ============================================
// Order Relations
// ============================================

export const uploadRelations = relations(upload, ({ one, many }) => ({
  shoppingMallTemplate: one(shoppingMallTemplate, {
    fields: [upload.shoppingMallId],
    references: [shoppingMallTemplate.id],
  }),
  orders: many(order),
}))

export const orderRelations = relations(order, ({ one }) => ({
  upload: one(upload, {
    fields: [order.uploadId],
    references: [upload.id],
  }),
  manufacturer: one(manufacturer, {
    fields: [order.manufacturerId],
    references: [manufacturer.id],
  }),
}))

export const orderEmailLogRelations = relations(orderEmailLog, ({ one, many }) => ({
  manufacturer: one(manufacturer, {
    fields: [orderEmailLog.manufacturerId],
    references: [manufacturer.id],
  }),
  items: many(orderEmailLogItem),
}))

export const orderEmailLogItemRelations = relations(orderEmailLogItem, ({ one }) => ({
  orderEmailLog: one(orderEmailLog, {
    fields: [orderEmailLogItem.emailLogId],
    references: [orderEmailLog.id],
  }),
}))

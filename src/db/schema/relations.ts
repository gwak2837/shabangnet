import { relations } from 'drizzle-orm'

import { accounts, roles, sessions, users, usersToRoles } from './auth'
import { invoiceTemplates, manufacturers, optionMappings, orderTemplates, products } from './manufacturers'
import { emailLogOrders, emailLogs, orders, uploads } from './orders'
import { shoppingMallTemplates } from './settings'

// ============================================
// Auth Relations
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  roles: many(usersToRoles),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(usersToRoles),
}))

export const usersToRolesRelations = relations(usersToRoles, ({ one }) => ({
  user: one(users, {
    fields: [usersToRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [usersToRoles.roleId],
    references: [roles.id],
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

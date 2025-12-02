import { boolean, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { authTypeEnum, userStatusEnum } from './enums'

// ============================================
// 사용자 (Users) - better-auth core + custom fields
// ============================================

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  // Two-factor 플러그인 필드
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  // Custom fields
  status: userStatusEnum('status').notNull().default('pending'),
  onboardingComplete: boolean('onboarding_complete').notNull().default(false),
  authType: authTypeEnum('auth_type').notNull().default('password'),
}).enableRLS()

// ============================================
// 세션 (Sessions) - better-auth core
// ============================================

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
}).enableRLS()

// ============================================
// 계정 (Accounts) - better-auth core (OAuth)
// ============================================

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  idToken: text('id_token'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}).enableRLS()

// ============================================
// 인증 토큰 (Verification) - better-auth core
// ============================================

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}).enableRLS()

// ============================================
// 2단계 인증 (Two Factor) - better-auth two-factor plugin
// ============================================

export const twoFactor = pgTable('two_factor', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  secret: text('secret').notNull(),
  backupCodes: text('backup_codes').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}).enableRLS()

// ============================================
// 패스키 (Passkey) - better-auth passkey plugin
// ============================================

export const passkey = pgTable('passkey', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name'),
  publicKey: text('public_key').notNull(),
  credentialID: text('credential_id').notNull().unique(),
  counter: integer('counter').notNull().default(0),
  deviceType: text('device_type'),
  backedUp: boolean('backed_up').default(false),
  transports: text('transports'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  aaguid: text('aaguid'),
}).enableRLS()

// ============================================
// 역할 (Roles) - Custom
// ============================================

export const role = pgTable('role', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}).enableRLS()

// ============================================
// 사용자-역할 매핑 (Users to Roles) - Custom
// ============================================

export const userToRole = pgTable('user_to_role', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  roleId: text('role_id')
    .notNull()
    .references(() => role.id, { onDelete: 'cascade' }),
}).enableRLS()

// ============================================
// Type exports
// ============================================

export type Account = typeof account.$inferSelect
export type NewUser = typeof user.$inferInsert
export type Passkey = typeof passkey.$inferSelect
export type Role = typeof role.$inferSelect
export type Session = typeof session.$inferSelect
export type TwoFactor = typeof twoFactor.$inferSelect
export type User = typeof user.$inferSelect

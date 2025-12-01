import type { AdapterAccount } from 'next-auth/adapters'

import { boolean, integer, pgTable, primaryKey, text, timestamp, varchar } from 'drizzle-orm/pg-core'

// ============================================
// 사용자 (Users)
// ============================================

export const users = pgTable('user', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  password: text('password'), // For Credentials provider
  invalidateSessionsBefore: timestamp('invalidate_sessions_before', { withTimezone: true }),
  totpEnabled: boolean('totp_enabled').default(false).notNull(),
  passkeyEnabled: boolean('passkey_enabled').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS()

// ============================================
// 계정 (Accounts) - OAuth 연동
// ============================================

export const accounts = pgTable(
  'account',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccount['type']>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })],
).enableRLS()

// ============================================
// 세션 (Sessions)
// ============================================

export const sessions = pgTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
}).enableRLS()

// ============================================
// 이메일 인증 토큰 (Verification Tokens)
// ============================================

export const verificationTokens = pgTable(
  'verificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (verificationToken) => [primaryKey({ columns: [verificationToken.identifier, verificationToken.token] })],
).enableRLS()

// ============================================
// 로그인 시도 기록 (Login Attempts)
// ============================================

export const loginAttempts = pgTable('login_attempts', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: varchar('email', { length: 255 }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }), // IPv6 지원
  success: boolean('success').notNull(),
  attemptedAt: timestamp('attempted_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS()

// ============================================
// 계정 잠금 (Account Locks)
// ============================================

export const accountLocks = pgTable('account_locks', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: varchar('email', { length: 255 }).notNull().unique(),
  unlockToken: text('unlock_token').notNull(),
  lockedAt: timestamp('locked_at', { withTimezone: true }).defaultNow().notNull(),
  unlockedAt: timestamp('unlocked_at', { withTimezone: true }),
}).enableRLS()

// ============================================
// 비밀번호 재설정 토큰 (Password Reset Tokens)
// ============================================

export const passwordResetTokens = pgTable('password_reset_token', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: varchar('email', { length: 255 }).notNull().unique(),
  token: text('token').notNull().unique(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
  usedAt: timestamp('used_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS()

// ============================================
// 역할 (Roles)
// ============================================

export const roles = pgTable('role', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar('name', { length: 50 }).notNull().unique(), // e.g. 'admin', 'customer'
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS()

// ============================================
// 사용자-역할 매핑 (Users to Roles)
// ============================================

export const usersToRoles = pgTable(
  'users_to_roles',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: text('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.roleId] })],
).enableRLS()

// ============================================
// TOTP 자격 증명 (TOTP Credentials)
// ============================================

export const totpCredentials = pgTable('totp_credentials', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  secret: text('secret').notNull(), // AES-256-GCM 암호화 저장
  verified: boolean('verified').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS()

// ============================================
// 패스키 자격 증명 (Passkey Credentials - WebAuthn)
// ============================================

export const passkeyCredentials = pgTable('passkey_credentials', {
  id: text('id').primaryKey(), // credential ID (base64url)
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  publicKey: text('public_key').notNull(), // 공개키 (base64)
  counter: integer('counter').notNull().default(0),
  deviceType: text('device_type'), // 'singleDevice' | 'multiDevice'
  backedUp: boolean('backed_up').default(false),
  transports: text('transports'), // JSON array of transports
  name: varchar('name', { length: 100 }), // 사용자가 지정한 이름 (예: "MacBook Pro")
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
}).enableRLS()

// ============================================
// 복구 코드 (Recovery Codes)
// ============================================

export const recoveryCodes = pgTable('recovery_codes', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  code: text('code').notNull(), // bcrypt 해시 저장
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS()

// ============================================
// 신뢰할 수 있는 기기 (Trusted Devices) - 일반 사용자용
// ============================================

export const trustedDevices = pgTable('trusted_devices', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  deviceFingerprint: text('device_fingerprint').notNull(), // 기기 식별자
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }), // IPv6 지원
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS()

// ============================================
// WebAuthn 챌린지 (임시 저장용)
// ============================================

export const webauthnChallenges = pgTable('webauthn_challenges', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  challenge: text('challenge').notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'registration' | 'authentication'
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS()

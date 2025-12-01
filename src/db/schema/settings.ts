import { boolean, integer, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'

// ============================================
// 설정 (Settings)
// ============================================

export const settings = pgTable('settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: text('value'),
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ============================================
// 택배사 코드 매핑 (Courier Mappings)
// ============================================

export const courierMappings = pgTable('courier_mappings', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 10 }).notNull(),
  aliases: text('aliases').array(), // 별칭 배열
  enabled: boolean('enabled').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ============================================
// 발송 제외 패턴 (Exclusion Patterns)
// ============================================

export const exclusionPatterns = pgTable('exclusion_patterns', {
  id: text('id').primaryKey(),
  pattern: varchar('pattern', { length: 255 }).notNull(),
  description: text('description'),
  enabled: boolean('enabled').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ============================================
// 쇼핑몰별 파일 템플릿 (Shopping Mall Templates)
// ============================================

export const shoppingMallTemplates = pgTable('shopping_mall_templates', {
  id: text('id').primaryKey(),
  mallName: varchar('mall_name', { length: 100 }).notNull().unique(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  columnMappings: text('column_mappings'), // JSON: 쇼핑몰 컬럼 -> 사방넷 컬럼 매핑
  headerRow: integer('header_row').default(1),
  dataStartRow: integer('data_start_row').default(2),
  enabled: boolean('enabled').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

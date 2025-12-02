import { pgEnum } from 'drizzle-orm/pg-core'

export const orderStatusEnum = pgEnum('order_status', ['pending', 'processing', 'completed', 'error'])
export const emailStatusEnum = pgEnum('email_status', ['success', 'failed', 'pending'])
export const uploadTypeEnum = pgEnum('upload_type', ['sabangnet', 'shopping_mall'])
export const authTypeEnum = pgEnum('auth_type', ['password', 'passkey', 'social'])
export const userStatusEnum = pgEnum('user_status', ['pending', 'approved', 'rejected'])

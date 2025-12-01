/**
 * 테스트 유저 시드 스크립트
 *
 * 실행 방법:
 * npm run db:seed:users
 *
 * 주의: Production 환경에서는 절대 실행되지 않습니다.
 */

import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { TEST_ACCOUNTS } from '@/common/constants/server'

import { roles, users, usersToRoles } from '../src/db/schema/auth'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function seed() {
  // 1. 안전장치: Production 환경 실행 차단
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ This script cannot be run in production environment.')
    process.exit(1)
  }

  // 2. 환경변수 확인
  const databaseUrl = process.env.DATABASE_URL
  const testUserPassword = process.env.TEST_USER_PASSWORD

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set')
    process.exit(1)
  }

  if (!testUserPassword) {
    console.error('❌ TEST_USER_PASSWORD environment variable is not set')
    process.exit(1)
  }

  console.log('🌱 Seeding test users...')

  const client = postgres(databaseUrl, {
    prepare: false,
    max: 1,
    ssl: process.env.SUPABASE_CERTIFICATE
      ? { ca: process.env.SUPABASE_CERTIFICATE, rejectUnauthorized: true }
      : 'prefer',
  })

  const db = drizzle(client)

  try {
    // 3. 역할(Role) 생성 및 확인
    const roleNames = ['admin', 'staff', 'user']
    const roleMap: Record<string, string> = {}

    for (const roleName of roleNames) {
      let role = await db
        .select()
        .from(roles)
        .where(eq(roles.name, roleName))
        .limit(1)
        .then((rows) => rows[0])

      if (!role) {
        console.log(`Creating role: ${roleName}`)
        const [newRole] = await db
          .insert(roles)
          .values({
            name: roleName,
            description: `${roleName} role for testing`,
          })
          .returning()
        role = newRole
      }
      roleMap[roleName] = role.id
    }

    // 4. 테스트 유저 생성
    const hashedPassword = await bcrypt.hash(testUserPassword, 10)

    for (const account of TEST_ACCOUNTS) {
      // 유저 존재 여부 확인
      let user = await db
        .select()
        .from(users)
        .where(eq(users.email, account.email))
        .limit(1)
        .then((rows) => rows[0])

      if (!user) {
        console.log(`Creating user: ${account.email} (${account.name})`)
        const [newUser] = await db
          .insert(users)
          .values({
            email: account.email,
            name: account.name,
            password: hashedPassword,
            emailVerified: new Date(),
          })
          .returning()
        user = newUser
      } else {
        console.log(`Updating user password: ${account.email}`)
        // 비밀번호 업데이트 (환경변수가 바뀌었을 수 있으므로)
        const [updatedUser] = await db
          .update(users)
          .set({ password: hashedPassword })
          .where(eq(users.id, user.id))
          .returning()
        user = updatedUser
      }

      // 5. 유저-권한 매핑
      const roleId = roleMap[account.role]
      if (roleId) {
        const userRole = await db
          .select()
          .from(usersToRoles)
          .where(eq(usersToRoles.userId, user.id))
          .limit(1)
          .then((rows) => rows[0])

        if (!userRole) {
          console.log(`Assigning role ${account.role} to ${account.email}`)
          await db.insert(usersToRoles).values({
            userId: user.id,
            roleId: roleId,
          })
        } else if (userRole.roleId !== roleId) {
          console.log(`Updating role for ${account.email} to ${account.role}`)
          await db.update(usersToRoles).set({ roleId: roleId }).where(eq(usersToRoles.userId, user.id))
        }
      }
    }

    console.log('🎉 Test users seeding completed!')
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

seed()

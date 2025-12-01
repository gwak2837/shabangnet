/**
 * 테스트 유저 시드 스크립트
 *
 * 실행 방법:
 * npm run db:seed:users
 *
 * 기능:
 * - 기존 테스트 사용자를 삭제하고 새로 생성
 * - 관리자 계정에 복구 코드 생성
 *
 * 주의: Production 환경에서는 절대 실행되지 않습니다.
 */

// ⚠️ This MUST be the first import - loads .env.local
import './env-loader'

import bcrypt from 'bcryptjs'
import { eq, inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { generateRecoveryCode } from '@/lib/mfa/crypto'

import { recoveryCodes, roles, users, usersToRoles } from '../src/db/schema/auth'

function getTestAccounts(adminEmail: string) {
  return [
    { email: adminEmail, name: 'Test Admin', role: 'admin' },
    { email: 'staff@test.com', name: 'Test Staff', role: 'staff' },
    { email: 'user@test.com', name: 'Test User', role: 'user' },
  ]
}

async function seed() {
  // 1. 안전장치: Production 환경 실행 차단
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ This script cannot be run in production environment.')
    process.exit(1)
  }

  // 2. 환경변수 확인
  const databaseUrl = process.env.DATABASE_URL
  const testUserEmail = process.env.TEST_USER_EMAIL
  const testUserPassword = process.env.TEST_USER_PASSWORD

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set')
    process.exit(1)
  }

  if (!testUserEmail) {
    console.error('❌ TEST_USER_EMAIL environment variable is not set')
    process.exit(1)
  }

  if (!testUserPassword) {
    console.error('❌ TEST_USER_PASSWORD environment variable is not set')
    process.exit(1)
  }

  const testAccounts = getTestAccounts(testUserEmail)

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
    // 기존 테스트 사용자 삭제
    const testEmails = testAccounts.map((account) => account.email)

    // 삭제할 사용자 ID 조회
    const existingUsers = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(inArray(users.email, testEmails))

    if (existingUsers.length > 0) {
      const userIds = existingUsers.map((u) => u.id)

      // 사용자-역할 매핑 삭제 (cascade가 없는 관계)
      await db.delete(usersToRoles).where(inArray(usersToRoles.userId, userIds))

      // 사용자 삭제 (관련 accounts, sessions, MFA credentials 등은 cascade로 자동 삭제)
      await db.delete(users).where(inArray(users.id, userIds))
      console.log(`  🗑️  Deleted ${existingUsers.length} test users: ${existingUsers.map((u) => u.email).join(', ')}`)
    } else {
      console.log('  ℹ️  No existing test users to delete')
    }

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
    const adminRecoveryCodes: string[] = []

    for (const account of testAccounts) {
      // 새 유저 생성 (기존 유저는 위에서 삭제됨)
      console.log(`Creating user: ${account.email} (${account.name})`)
      const [user] = await db
        .insert(users)
        .values({
          email: account.email,
          name: account.name,
          password: hashedPassword,
          emailVerified: new Date(),
        })
        .returning()

      // 5. 유저-권한 매핑
      const roleId = roleMap[account.role]
      if (roleId) {
        console.log(`  → Assigning role: ${account.role}`)
        await db.insert(usersToRoles).values({
          userId: user.id,
          roleId: roleId,
        })
      }

      // 6. Admin 사용자에게 복구 코드 생성
      if (account.role === 'admin') {
        const codeCount = 10
        for (let i = 0; i < codeCount; i++) {
          const code = generateRecoveryCode()
          const hashedCode = await bcrypt.hash(code, 10)

          await db.insert(recoveryCodes).values({
            userId: user.id,
            code: hashedCode,
          })

          adminRecoveryCodes.push(code)
        }
        console.log(`  → Generated ${codeCount} recovery codes for admin`)
      }
    }

    console.log('\n🎉 Test users seeding completed!')
    console.log('\n📋 Test Accounts:')
    for (const account of testAccounts) {
      console.log(`  - ${account.email} (${account.role})`)
    }

    if (adminRecoveryCodes.length > 0) {
      console.log('\n🔐 Admin Recovery Codes (save these!):')
      adminRecoveryCodes.forEach((code, i) => {
        console.log(`  ${i + 1}. ${code}`)
      })
    }
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

seed()

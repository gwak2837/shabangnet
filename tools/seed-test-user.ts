/**
 * E2E 테스트용 사용자 계정 시드 스크립트
 *
 * 테스트용 이메일/비밀번호 계정을 생성합니다.
 *
 * 실행 방법:
 * pnpm tsx tools/seed-test-user.ts
 */

import './server-only'

import { scrypt } from '@noble/hashes/scrypt.js'
import { bytesToHex, randomBytes } from '@noble/hashes/utils.js'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { account, user } from '../src/db/schema/auth'

// 테스트 계정 설정
const TEST_USER = {
  email: 'test@e2e.local',
  password: 'Test1234!',
  name: 'E2E 테스트 계정',
}

// better-auth 호환 비밀번호 해싱
// better-auth는 @noble/hashes/scrypt 사용, 형식은 "salt:hash"
function hashPassword(password: string): string {
  // better-auth와 동일한 설정
  const config = { N: 16384, r: 16, p: 1, dkLen: 64 }

  // 16바이트 랜덤 salt (hex 인코딩)
  const saltBytes = randomBytes(16)
  const salt = bytesToHex(saltBytes)

  // scrypt 해싱 (password를 NFKC 정규화)
  const key = scrypt(password.normalize('NFKC'), salt, config)

  // better-auth 형식: salt:hash
  return `${salt}:${bytesToHex(key)}`
}

async function seed() {
  const databaseUrl = process.env.SUPABASE_POSTGRES_URL_NON_POOLING
  if (!databaseUrl) {
    console.error('❌ SUPABASE_POSTGRES_URL_NON_POOLING environment variable is not set')
    process.exit(1)
  }

  console.log('🌱 E2E 테스트 계정 시드 시작...')
  console.log(`   DB URL: ${databaseUrl}\n`)

  const client = postgres(databaseUrl, {
    prepare: false,
    max: 1,
    ssl: process.env.SUPABASE_CERTIFICATE
      ? { ca: process.env.SUPABASE_CERTIFICATE, rejectUnauthorized: true }
      : 'prefer',
  })

  const db = drizzle(client)

  try {
    // 이미 존재하는지 확인
    const existing = await db.select().from(user).where(eq(user.email, TEST_USER.email)).limit(1)

    if (existing.length > 0) {
      console.log(`⏭️  테스트 계정이 이미 존재합니다: ${TEST_USER.email}`)
      console.log(`\n📋 테스트 계정 정보:`)
      console.log(`   이메일: ${TEST_USER.email}`)
      console.log(`   비밀번호: ${TEST_USER.password}`)
      return
    }

    // 비밀번호 해싱
    const hashedPassword = hashPassword(TEST_USER.password)

    // 사용자 ID 생성
    const userId = `user_e2e_${Date.now().toString(36)}`

    // 사용자 생성
    await db.insert(user).values({
      id: userId,
      name: TEST_USER.name,
      email: TEST_USER.email,
      emailVerified: true,
      status: 'approved', // 승인된 상태
      onboardingComplete: true, // 온보딩 완료
      isAdmin: true, // 관리자 권한
      authType: 'password',
    })

    // 계정(credential) 생성 - better-auth 호환
    await db.insert(account).values({
      id: `acc_e2e_${Date.now().toString(36)}`,
      accountId: userId,
      providerId: 'credential', // better-auth의 이메일/비밀번호 provider
      userId: userId,
      password: hashedPassword,
    })

    console.log(`✅ 테스트 계정 생성 완료!`)
    console.log(`\n📋 테스트 계정 정보:`)
    console.log(`   이메일: ${TEST_USER.email}`)
    console.log(`   비밀번호: ${TEST_USER.password}`)
    console.log(`   상태: 승인됨 (approved)`)
    console.log(`   관리자: 예`)

    console.log('\n🎉 E2E 테스트 계정 시드 완료!')
  } catch (error) {
    console.error('❌ 시드 실패:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

seed()

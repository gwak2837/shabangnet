/**
 * 테스트용 제조사 시드 스크립트
 * 실행: npx tsx tools/seed-test-manufacturer.ts
 */

import dotenv from 'dotenv'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { manufacturers } from '../src/db/schema/manufacturers'

// .env 파일 로드
dotenv.config({ path: '.env.local' })

async function seed() {
  const connectionString = process.env.SUPABASE_POSTGRES_URL_NON_POOLING

  if (!connectionString) {
    console.error('❌ SUPABASE_POSTGRES_URL_NON_POOLING is not set')
    process.exit(1)
  }

  console.log('🌱 테스트 제조사 시드 시작...')

  const client = postgres(connectionString, {
    prepare: false,
    max: 1,
    ssl: process.env.SUPABASE_CERTIFICATE
      ? { ca: process.env.SUPABASE_CERTIFICATE, rejectUnauthorized: true }
      : 'prefer',
  })

  const db = drizzle(client)

  try {
    // 테스트 제조사 데이터
    const testManufacturers = [
      {
        id: 'mfr_test_001',
        name: '테스트제조사',
        contactName: '테스트담당자',
        email: 'test@example.com',
        phone: '010-1234-5678',
        orderCount: 0,
      },
      {
        id: 'mfr_test_002',
        name: '고창베리세상',
        contactName: '베리담당자',
        email: 'berry@example.com',
        phone: '010-2345-6789',
        orderCount: 0,
      },
      {
        id: 'mfr_test_003',
        name: '마루영농',
        contactName: '마루담당자',
        email: 'maru@example.com',
        phone: '010-3456-7890',
        orderCount: 0,
      },
    ]

    for (const manufacturer of testManufacturers) {
      // 이미 존재하는지 확인
      const existing = await db
        .select()
        .from(manufacturers)
        .where(eq(manufacturers.id, manufacturer.id))
        .limit(1)

      if (existing.length > 0) {
        console.log(`⏭️  건너뜀: ${manufacturer.name} (이미 존재)`)
        continue
      }

      await db.insert(manufacturers).values(manufacturer)
      console.log(`✅ 제조사 등록: ${manufacturer.name}`)
    }

    console.log('\n🎉 테스트 제조사 시드 완료!')
  } catch (error) {
    console.error('❌ 시드 실패:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

seed()


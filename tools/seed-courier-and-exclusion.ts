import './server-only'

import { eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { courierMapping, exclusionPattern } from '../src/db/schema/settings'

const DEFAULT_EXCLUSION_PATTERNS = [
  { pattern: '[30002002]주문_센터택배', description: 'CJ온스타일 센터택배' },
  { pattern: '[30002002]주문_직택배', description: 'CJ온스타일 직택배' },
  { pattern: '현대홈직택배[제휴몰]현대이지웰', description: '현대홈쇼핑 제휴몰' },
  { pattern: '현대홈직택배', description: '현대홈쇼핑 직택배' },
]

const DEFAULT_COURIER_MAPPINGS = [
  { name: 'CJ대한통운', code: '04', aliases: ['CJ대한통운', 'CJ택배', 'CJ', '대한통운', 'CJGLS'] },
  { name: '한진택배', code: '05', aliases: ['한진택배', '한진', 'HANJIN'] },
  { name: '롯데택배', code: '08', aliases: ['롯데택배', '롯데', 'LOTTE', '롯데글로벌로지스'] },
  { name: '우체국택배', code: '01', aliases: ['우체국택배', '우체국', '우편', 'EPOST'] },
  { name: '로젠택배', code: '06', aliases: ['로젠택배', '로젠', 'LOGEN'] },
  { name: '경동택배', code: '23', aliases: ['경동택배', '경동', 'KD택배'] },
  { name: '대신택배', code: '22', aliases: ['대신택배', '대신'] },
  { name: '일양로지스', code: '11', aliases: ['일양로지스', '일양택배', '일양'] },
  { name: '합동택배', code: '32', aliases: ['합동택배', '합동'] },
  { name: 'GS포스트박스', code: '24', aliases: ['GS포스트박스', 'GS택배', 'CVSnet'] },
]

async function seed() {
  const databaseURL = process.env.SUPABASE_POSTGRES_URL_NON_POOLING

  if (!databaseURL) {
    console.error('❌ SUPABASE_POSTGRES_URL_NON_POOLING environment variable is not set')
    process.exit(1)
  }

  console.log('🌱 Seeding default settings...')

  const client = postgres(databaseURL, {
    prepare: false,
    max: 1,
    ssl: process.env.SUPABASE_CERTIFICATE
      ? { ca: process.env.SUPABASE_CERTIFICATE, rejectUnauthorized: true }
      : 'prefer',
  })

  const db = drizzle(client)

  try {
    // 발송 제외 패턴 시드
    console.log('\n📋 Seeding exclusion patterns...')
    let exclusionUpserted = 0
    let exclusionErrored = 0

    for (const pattern of DEFAULT_EXCLUSION_PATTERNS) {
      try {
        await db
          .insert(exclusionPattern)
          .values({
            pattern: pattern.pattern,
            description: pattern.description,
            enabled: true,
          })
          .onConflictDoUpdate({
            target: exclusionPattern.pattern,
            set: {
              description: sql`excluded.description`,
              enabled: sql`excluded.enabled`,
            },
          })

        exclusionUpserted++
        console.log(`  ✅ ${pattern.pattern}`)
      } catch (error) {
        exclusionErrored++
        console.error(`  ❌ ${pattern.pattern}`, error)
      }
    }

    // 택배사 연결 시드
    console.log('\n📦 Seeding courier mappings...')
    let courierUpserted = 0
    let courierErrored = 0

    for (const courier of DEFAULT_COURIER_MAPPINGS) {
      try {
        await db.transaction(async (tx) => {
          const [byCode] = await tx
            .select({ id: courierMapping.id, name: courierMapping.name, code: courierMapping.code })
            .from(courierMapping)
            .where(eq(courierMapping.code, courier.code))

          const [byName] = await tx
            .select({ id: courierMapping.id, name: courierMapping.name, code: courierMapping.code })
            .from(courierMapping)
            .where(eq(courierMapping.name, courier.name))

          // 데이터가 꼬여서 "같은 name과 같은 code가 서로 다른 row"에 있는 경우 병합
          if (byCode && byName && byCode.id !== byName.id) {
            await tx.delete(courierMapping).where(eq(courierMapping.id, byName.id))
            await tx
              .update(courierMapping)
              .set({
                name: courier.name,
                aliases: courier.aliases,
                enabled: true,
              })
              .where(eq(courierMapping.id, byCode.id))
          } else if (byCode) {
            await tx
              .update(courierMapping)
              .set({
                name: courier.name,
                aliases: courier.aliases,
                enabled: true,
              })
              .where(eq(courierMapping.id, byCode.id))
          } else if (byName) {
            await tx
              .update(courierMapping)
              .set({
                code: courier.code,
                aliases: courier.aliases,
                enabled: true,
              })
              .where(eq(courierMapping.id, byName.id))
          } else {
            await tx.insert(courierMapping).values({
              name: courier.name,
              code: courier.code,
              aliases: courier.aliases,
              enabled: true,
            })
          }
        })

        courierUpserted++
        console.log(`  ✅ ${courier.name} (${courier.code})`)
      } catch (error) {
        courierErrored++
        console.error(`  ❌ ${courier.name} (${courier.code})`, error)
      }
    }

    // 결과 요약
    console.log('\n📊 Summary:')
    console.log(`   Exclusion patterns: ${exclusionUpserted} upserted, ${exclusionErrored} errored`)
    console.log(`   Courier mappings: ${courierUpserted} upserted, ${courierErrored} errored`)

    console.log('\n🎉 Seeding completed!')
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

seed()

import './server-only'

import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import fs from 'fs'
import path from 'path'
import postgres from 'postgres'

import { manufacturer } from '../src/db/schema/manufacturers'

// 추출된 제조사 데이터 타입
interface ExtractedManufacturer {
  name: string
  orderCount: number
  productCodeCount: number
}

// 이메일 placeholder 생성 (실제 이메일은 UI에서 설정)
function generatePlaceholderEmail(name: string): string {
  const normalized = name
    .replace(/[()]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_가-힣]/g, '')
    .toLowerCase()
  // 한글 이름은 영문으로 변환하지 않고 placeholder 사용
  return `${normalized}@placeholder.local`
}

async function seed() {
  const databaseURL = process.env.SUPABASE_POSTGRES_URL_NON_POOLING
  if (!databaseURL) {
    console.error('❌ SUPABASE_POSTGRES_URL_NON_POOLING environment variable is not set')
    process.exit(1)
  }

  // 추출된 데이터 파일 확인
  const extractedDataPath = path.join(__dirname, '../public/data/extracted/manufacturers.json')
  if (!fs.existsSync(extractedDataPath)) {
    console.error('❌ 추출된 제조사 데이터 파일이 없습니다.')
    console.error('   먼저 pnpm tsx tools/analyze-real-data.ts 를 실행하세요.')
    process.exit(1)
  }

  console.log('🌱 실제 제조사 데이터 시드 시작...\n')

  const client = postgres(databaseURL, {
    prepare: false,
    max: 1,
    ssl: process.env.SUPABASE_CERTIFICATE
      ? { ca: process.env.SUPABASE_CERTIFICATE, rejectUnauthorized: true }
      : 'prefer',
  })

  const db = drizzle(client)

  try {
    // 추출된 데이터 로드
    const extractedData: ExtractedManufacturer[] = JSON.parse(fs.readFileSync(extractedDataPath, 'utf-8'))
    console.log(`📄 ${extractedData.length}개 제조사 데이터 로드\n`)

    let created = 0
    let skipped = 0
    let errors = 0

    for (const mfr of extractedData) {
      try {
        // 이미 존재하는지 확인 (이름으로 검색)
        const existing = await db.select().from(manufacturer).where(eq(manufacturer.name, mfr.name)).limit(1)

        if (existing.length > 0) {
          console.log(`⏭️  건너뜀: ${mfr.name} (이미 존재)`)
          skipped++
          continue
        }

        // 새 제조사 등록
        await db.insert(manufacturer).values({
          name: mfr.name,
          email: generatePlaceholderEmail(mfr.name),
          orderCount: mfr.orderCount,
        })

        console.log(`✅ 등록: ${mfr.name} (주문 ${mfr.orderCount}건)`)
        created++
      } catch (error) {
        console.error(`❌ 오류: ${mfr.name}:`, error)
        errors++
      }
    }

    // 결과 요약
    console.log('\n' + '='.repeat(50))
    console.log('📊 시드 결과 요약')
    console.log('='.repeat(50))
    console.log(`   등록: ${created}개`)
    console.log(`   건너뜀: ${skipped}개`)
    console.log(`   오류: ${errors}개`)

    console.log('\n🎉 제조사 시드 완료!')
    console.log('\n💡 참고: 이메일 주소는 placeholder로 설정되었습니다.')
    console.log('   실제 이메일은 관리 화면에서 설정해주세요.')
  } catch (error) {
    console.error('❌ 시드 실패:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

seed()

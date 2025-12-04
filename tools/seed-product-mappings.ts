/**
 * 상품-제조사 매핑 시드 스크립트
 *
 * real-data에서 추출한 상품-제조사 매핑 데이터를 DB에 등록합니다.
 *
 * 실행 방법:
 * pnpm tsx tools/seed-product-mappings.ts
 */

import './server-only'

import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import fs from 'fs'
import path from 'path'
import postgres from 'postgres'

import { manufacturer, optionMapping, product } from '../src/db/schema/manufacturers'

// 추출된 매핑 데이터 타입
interface ExtractedMapping {
  manufacturer: string
  optionName: string
  productCode: string
  productName: string
}

// 제조사 이름으로 ID 찾기
async function findManufacturerId(db: ReturnType<typeof drizzle>, name: string): Promise<string | null> {
  const result = await db.select().from(manufacturer).where(eq(manufacturer.name, name)).limit(1)
  return result.length > 0 ? result[0].id : null
}

// ID 생성 헬퍼
function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`
}

async function seed() {
  const databaseUrl = process.env.SUPABASE_POSTGRES_URL_NON_POOLING
  if (!databaseUrl) {
    console.error('❌ SUPABASE_POSTGRES_URL_NON_POOLING environment variable is not set')
    process.exit(1)
  }

  // 추출된 데이터 파일 확인
  const extractedDataPath = path.join(__dirname, '../public/data/extracted/product-mappings.json')
  if (!fs.existsSync(extractedDataPath)) {
    console.error('❌ 추출된 상품 매핑 데이터 파일이 없습니다.')
    console.error('   먼저 pnpm tsx tools/analyze-real-data.ts 를 실행하세요.')
    process.exit(1)
  }

  console.log('🌱 상품-제조사 매핑 시드 시작...\n')

  const client = postgres(databaseUrl, {
    prepare: false,
    max: 1,
    ssl: process.env.SUPABASE_CERTIFICATE
      ? { ca: process.env.SUPABASE_CERTIFICATE, rejectUnauthorized: true }
      : 'prefer',
  })

  const db = drizzle(client)

  try {
    // 추출된 데이터 로드
    const extractedData: ExtractedMapping[] = JSON.parse(fs.readFileSync(extractedDataPath, 'utf-8'))
    console.log(`📄 ${extractedData.length}개 매핑 데이터 로드\n`)

    // 제조사 ID 캐시 (성능 최적화)
    const manufacturerCache = new Map<string, string | null>()

    // 통계
    let productsCreated = 0
    let productsSkipped = 0
    let optionMappingsCreated = 0
    let optionMappingsSkipped = 0
    let noManufacturer = 0
    let errors = 0

    // 상품코드가 있는 매핑 처리 (product 테이블)
    const productCodeMappings = extractedData.filter(
      (m) => m.productCode && m.productCode !== '' && m.productCode !== '1',
    )
    console.log(`📦 상품코드가 있는 매핑: ${productCodeMappings.length}개\n`)

    // 상품코드별로 그룹화 (같은 상품코드는 하나의 product로)
    const productCodeGroups = new Map<string, ExtractedMapping[]>()
    for (const mapping of productCodeMappings) {
      const existing = productCodeGroups.get(mapping.productCode) || []
      existing.push(mapping)
      productCodeGroups.set(mapping.productCode, existing)
    }

    console.log(`🔄 ${productCodeGroups.size}개 고유 상품코드 처리 중...\n`)

    for (const [productCode, mappings] of productCodeGroups) {
      // 첫 번째 매핑 사용 (상품명, 제조사)
      const firstMapping = mappings[0]

      try {
        // 제조사 ID 찾기 (캐시 활용)
        let manufacturerId = manufacturerCache.get(firstMapping.manufacturer)
        if (manufacturerId === undefined) {
          manufacturerId = await findManufacturerId(db, firstMapping.manufacturer)
          manufacturerCache.set(firstMapping.manufacturer, manufacturerId)
        }

        if (!manufacturerId) {
          console.log(`⚠️  제조사 없음: ${firstMapping.manufacturer} (상품: ${productCode})`)
          noManufacturer++
          continue
        }

        // 이미 존재하는지 확인
        const existing = await db.select().from(product).where(eq(product.productCode, productCode)).limit(1)

        if (existing.length > 0) {
          productsSkipped++
          continue
        }

        // 새 상품 등록
        await db.insert(product).values({
          id: generateId('prod'),
          productCode,
          productName: firstMapping.productName,
          optionName: firstMapping.optionName || null,
          manufacturerId,
        })

        productsCreated++
        console.log(`✅ 상품: ${productCode} → ${firstMapping.manufacturer}`)
      } catch (error) {
        console.error(`❌ 오류 (상품 ${productCode}):`, error)
        errors++
      }

      // 딜레이
      await new Promise((resolve) => setTimeout(resolve, 5))
    }

    // 옵션 매핑 처리 (상품코드가 없거나 '1'인 경우)
    console.log('\n🏷️ 옵션 매핑 처리 중...\n')

    const optionMappingsData = extractedData.filter(
      (m) => !m.productCode || m.productCode === '' || m.productCode === '1',
    )

    // 상품명 + 옵션으로 그룹화
    const optionGroups = new Map<string, ExtractedMapping>()
    for (const mapping of optionMappingsData) {
      const key = `${mapping.productName}|${mapping.optionName}`
      if (!optionGroups.has(key)) {
        optionGroups.set(key, mapping)
      }
    }

    console.log(`📝 ${optionGroups.size}개 옵션 매핑 처리 중...\n`)

    for (const [, mapping] of optionGroups) {
      try {
        // 제조사 ID 찾기
        let manufacturerId = manufacturerCache.get(mapping.manufacturer)
        if (manufacturerId === undefined) {
          manufacturerId = await findManufacturerId(db, mapping.manufacturer)
          manufacturerCache.set(mapping.manufacturer, manufacturerId)
        }

        if (!manufacturerId) {
          noManufacturer++
          continue
        }

        // 상품명을 productCode로 사용 (해시)
        const productCodeFromName = mapping.productName.substring(0, 100)

        // 이미 존재하는지 확인 (상품명 + 옵션 조합)
        const existing = await db
          .select()
          .from(optionMapping)
          .where(eq(optionMapping.productCode, productCodeFromName))
          .limit(1)

        // 같은 상품명으로 이미 등록되어 있으면 스킵
        if (existing.some((e) => e.optionName === mapping.optionName)) {
          optionMappingsSkipped++
          continue
        }

        // 새 옵션 매핑 등록
        await db.insert(optionMapping).values({
          id: generateId('opt'),
          productCode: productCodeFromName,
          optionName: mapping.optionName || '기본',
          manufacturerId,
        })

        optionMappingsCreated++
      } catch (error) {
        // 중복 에러는 무시
        if (String(error).includes('duplicate') || String(error).includes('unique')) {
          optionMappingsSkipped++
        } else {
          errors++
        }
      }

      // 딜레이
      await new Promise((resolve) => setTimeout(resolve, 5))
    }

    // 결과 요약
    console.log('\n' + '='.repeat(50))
    console.log('📊 시드 결과 요약')
    console.log('='.repeat(50))
    console.log(`   상품 등록: ${productsCreated}개`)
    console.log(`   상품 건너뜀: ${productsSkipped}개`)
    console.log(`   옵션 매핑 등록: ${optionMappingsCreated}개`)
    console.log(`   옵션 매핑 건너뜀: ${optionMappingsSkipped}개`)
    console.log(`   제조사 없음: ${noManufacturer}개`)
    console.log(`   오류: ${errors}개`)

    console.log('\n🎉 상품-제조사 매핑 시드 완료!')
  } catch (error) {
    console.error('❌ 시드 실패:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

seed()

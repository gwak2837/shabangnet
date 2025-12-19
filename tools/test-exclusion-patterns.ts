/**
 * 제외 패턴 테스트 스크립트
 *
 * 사용법: pnpm tsx tools/test-exclusion-patterns.ts
 *
 * 변경사항:
 * - 업로드 시점에 excludedReason이 설정됨
 * - courier 필드에 fulfillmentType(T열) 데이터가 저장됨
 */

import 'dotenv/config'
import postgres from 'postgres'

interface ExclusionPattern {
  description: string | null
  enabled: boolean
  id: number
  pattern: string
}

interface Order {
  courier: string | null
  excluded_reason: string | null
  id: number
  manufacturer_id: number | null
  order_number: string
  shopping_mall: string | null
}

interface Setting {
  key: string
  value: string | null
}

const databaseURL = process.env.SUPABASE_POSTGRES_URL_NON_POOLING
if (!databaseURL) {
  console.error('❌ SUPABASE_POSTGRES_URL_NON_POOLING environment variable is not set')
  process.exit(1)
}

const sql = postgres(databaseURL, {
  prepare: false,
  max: 1,
  ssl: process.env.SUPABASE_CERTIFICATE
    ? { ca: Buffer.from(process.env.SUPABASE_CERTIFICATE, 'base64').toString() }
    : undefined,
})

async function testExclusionPatterns() {
  console.log('🔍 제외 패턴 테스트 시작...\n')

  // 1. 현재 설정된 제외 패턴 조회
  console.log('📋 현재 설정된 제외 패턴:')
  console.log('─'.repeat(60))

  const patterns = await sql<ExclusionPattern[]>`
    SELECT id, pattern, description, enabled
    FROM exclusion_pattern
    ORDER BY created_at
  `

  if (patterns.length === 0) {
    console.log('⚠️  설정된 제외 패턴이 없습니다.\n')
    console.log('💡 설정 > 발주 설정 > 발송 제외 설정에서 패턴을 추가해 주세요.')
    console.log('   예시: "[30002002]주문", "협력사직송", "현대홈직택배"')
  } else {
    for (const p of patterns) {
      const status = p.enabled ? '✅ 활성' : '❌ 비활성'
      console.log(`${status} | 패턴: "${p.pattern}"`)
      if (p.description) {
        console.log(`       | 설명: ${p.description}`)
      }
    }
  }

  // 2. 제외 기능 활성화 상태 확인
  console.log('\n' + '─'.repeat(60))

  const [exclusionEnabledSetting] = await sql<Setting[]>`
    SELECT key, value FROM settings WHERE key = 'exclusion_enabled'
  `

  const isExclusionEnabled = exclusionEnabledSetting?.value ? JSON.parse(exclusionEnabledSetting.value) : true

  console.log(`\n🔧 제외 기능 활성화: ${isExclusionEnabled ? '✅ 예' : '❌ 아니오'}`)

  // 3. 실제 주문 데이터에서 테스트
  console.log('\n' + '─'.repeat(60))
  console.log('\n📦 주문 데이터 분석:\n')

  const orders = await sql<Order[]>`
    SELECT id, order_number, shopping_mall, courier, manufacturer_id, excluded_reason
    FROM "order"
    WHERE manufacturer_id IS NOT NULL
    LIMIT 500
  `

  if (orders.length === 0) {
    console.log('⚠️  주문 데이터가 없습니다.')
    console.log('💡 먼저 주문 파일을 업로드해 주세요.')
  } else {
    // courier 필드에 fulfillmentType이 저장됨
    const fulfillmentTypes = new Map<string, { count: number; excludedCount: number }>()

    let totalExcluded = 0

    for (const o of orders) {
      const fulfillmentType = o.courier ?? o.shopping_mall ?? '(없음)'

      if (!fulfillmentTypes.has(fulfillmentType)) {
        fulfillmentTypes.set(fulfillmentType, { count: 0, excludedCount: 0 })
      }

      const entry = fulfillmentTypes.get(fulfillmentType)!
      entry.count++

      if (o.excluded_reason) {
        entry.excludedCount++
        totalExcluded++
      }
    }

    console.log('주문유형(T열/courier) 별 현황:')
    console.log('─'.repeat(60))

    const sortedEntries = [...fulfillmentTypes.entries()].sort((a, b) => b[1].count - a[1].count)

    for (const [type, info] of sortedEntries) {
      const excludedInfo = info.excludedCount > 0 ? ` (제외: ${info.excludedCount}건)` : ''
      const status = info.excludedCount === info.count ? '🚫' : info.excludedCount > 0 ? '⚠️' : '✅'
      console.log(`${status} | "${type}": ${info.count}건${excludedInfo}`)
    }

    console.log('\n' + '─'.repeat(60))
    console.log(`\n📊 요약:`)
    console.log(`   - 전체 주문: ${orders.length}건`)
    console.log(`   - 발송 대상: ${orders.length - totalExcluded}건`)
    console.log(`   - 제외 대상: ${totalExcluded}건`)

    if (totalExcluded === 0 && patterns.length > 0) {
      console.log('\n⚠️  제외 패턴이 설정되어 있지만 제외된 주문이 없습니다.')
      console.log('   → 패턴 설정 후 새로 업로드해야 excludedReason이 적용됩니다.')
    }
  }

  console.log('\n✅ 테스트 완료!')
  await sql.end()
}

testExclusionPatterns().catch((error) => {
  console.error('❌ 테스트 실패:', error)
  process.exit(1)
})

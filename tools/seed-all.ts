/**
 * 전체 시드 실행 스크립트
 *
 * 모든 시드 스크립트를 올바른 순서로 실행합니다.
 *
 * 실행 방법:
 * pnpm tsx tools/seed-all.ts
 */

import { execSync } from 'child_process'
import path from 'path'

const SEED_SCRIPTS = [
  // 1. 기본 설정 (택배사 코드, 발송 제외 패턴)
  'seed-settings.ts',
  // 2. 컬럼 동의어 (자동 매핑용)
  'seed-column-synonyms.ts',
  // 3. 쇼핑몰 템플릿
  'seed-shopping-mall-templates.ts',
  // 4. 제조사 데이터
  'seed-real-manufacturers.ts',
  // 5. 상품-제조사 매핑
  'seed-product-mappings.ts',
  // 6. E2E 테스트 계정
  'seed-test-user.ts',
]

async function main() {
  console.log('🚀 전체 시드 실행 시작\n')
  console.log('='.repeat(60) + '\n')

  const toolsDir = path.dirname(__filename)

  for (const script of SEED_SCRIPTS) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`📦 실행: ${script}`)
    console.log('='.repeat(60) + '\n')

    try {
      execSync(`pnpm tsx ${path.join(toolsDir, script)}`, {
        stdio: 'inherit',
        cwd: path.join(toolsDir, '..'),
      })
    } catch (error) {
      console.error(`❌ ${script} 실행 실패`, error)
      process.exit(1)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('🎉 전체 시드 완료!')
  console.log('='.repeat(60))
}

main()

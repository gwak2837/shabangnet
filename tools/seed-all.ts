import { execSync } from 'child_process'
import path from 'path'

const SEED_SCRIPTS = [
  // 1. 기본 설정 (택배사 코드, 발송 제외 패턴)
  'seed-settings.ts',
  // 1-0. 발주서 이메일 템플릿 (전사 1개, 무조건 덮어쓰기)
  'seed-order-email-template.ts',
  // 1-1. 발주서 템플릿 (전사 1개, 무조건 덮어쓰기)
  'seed-common-order-template.ts',
  // 2. 쇼핑몰 템플릿
  'seed-shopping-mall-templates.ts',
  // 3. 제조사 데이터
  'seed-real-manufacturers.ts',
  // 4. 상품-제조사 연결
  'seed-product-mappings.ts',
  // 5. E2E 테스트 계정
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

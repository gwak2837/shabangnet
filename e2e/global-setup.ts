import { execSync } from 'child_process'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.test.local'), quiet: true })

async function globalSetup() {
  const repoRoot = path.join(__dirname, '..')

  console.log('📦 테스트 DB 컨테이너 초기화 중...')
  try {
    // ✅ 매 E2E 실행마다 깨끗한 DB를 보장하기 위해 컨테이너를 항상 재생성해요.
    // (테스트 케이스마다 재시작하지는 않아요)
    execSync('docker compose rm -sf db-test', { cwd: repoRoot, stdio: 'inherit' })
    execSync('docker compose up -d db-test', { cwd: repoRoot, stdio: 'inherit' })

    console.log('   컨테이너 준비 대기 중...')
    await waitForDatabase()
  } catch (error) {
    console.error('❌ Docker 확인 실패. Docker가 실행 중인지 확인하세요.')
    throw error
  }

  // 2. DB 마이그레이션 실행
  console.log('\n📊 DB 마이그레이션 실행 중...')
  try {
    // drizzle-kit push를 테스트 DB로 직접 실행 (CI=true로 비대화형 모드)
    execSync("NODE_OPTIONS='--conditions=react-server' pnpm drizzle-kit push --force", {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      env: {
        ...process.env,
        DB_ENV: 'test',
      },
    })
  } catch (error) {
    console.error('❌ 마이그레이션 실패')
    throw error
  }

  // 3. 시드 데이터 적용
  console.log('\n🌱 시드 데이터 적용 중...')

  // 각 시드 스크립트 실행
  // 순서 중요: 기본 설정 → 템플릿 → 테스트 계정
  const seedScripts = [
    'seed-courier-and-exclusion.ts',
    'seed-order-email-template.ts',
    'seed-common-order-template.ts',
    'seed-shopping-mall-templates.ts',
    'seed-test-user.ts',
  ]

  for (const script of seedScripts) {
    console.log(`   ${script}`)
    const output = execSync(`pnpm tsx tools/${script}`, {
      cwd: repoRoot,
      encoding: 'utf-8',
      env: { ...process.env, DB_ENV: 'test' },
    })
    const lines = output.trim().split('\n').slice(0, 1)
    if (lines.length > 0) console.log(`   ${lines.join('\n   ')}`)
  }

  console.log('\n✅ E2E 테스트 전역 설정 완료!\n')
}

/**
 * PostgreSQL이 준비될 때까지 대기
 */
async function waitForDatabase(maxRetries = 30, intervalMs = 1000): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      execSync('docker exec daonfnc-test pg_isready -U test', {
        stdio: 'pipe',
      })
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
  }
  throw new Error('데이터베이스 연결 시간 초과')
}

export default globalSetup

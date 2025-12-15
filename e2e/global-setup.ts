import { execSync } from 'child_process'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.test.local'), quiet: true })

async function globalSetup() {
  console.log('📦 테스트 DB 컨테이너 확인 중...')
  try {
    const containerStatus = execSync('docker ps --filter "name=daonfnc-test" --format "{{.Status}}"', {
      encoding: 'utf-8',
    }).trim()

    if (!containerStatus) {
      console.log('   테스트 DB 컨테이너가 실행 중이 아닙니다. 시작합니다...')
      execSync('docker compose up -d db-test', {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
      })

      // 컨테이너가 준비될 때까지 대기
      console.log('   컨테이너 준비 대기 중...')
      await waitForDatabase()
    }
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
  // 순서 중요: 제조사 → 템플릿 → 상품 연결 (의존성 순서)
  const seedScripts = [
    'seed-settings.ts',
    'seed-shopping-mall-templates.ts',
    'seed-real-manufacturers.ts',
    'seed-order-templates.ts',
    'seed-product-mappings.ts',
    'seed-test-user.ts',
  ]

  for (const script of seedScripts) {
    console.log(`   ${script}`)
    try {
      const output = execSync(`pnpm tsx tools/${script}`, {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf-8',
        env: { ...process.env, DB_ENV: 'test' },
      })
      const lines = output.trim().split('\n').slice(0, 1)
      if (lines.length > 0) console.log(`   ${lines.join('\n   ')}`)
    } catch {
      // 이미 존재하는 데이터는 에러로 처리하지 않음
    }
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

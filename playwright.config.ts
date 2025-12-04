import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import ms from 'ms'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '.env.test.local'), quiet: true })

const E2E_TEST_PORT = 3010

export default defineConfig({
  // 전역 설정 (테스트 전 DB 초기화/시드)
  globalSetup: './e2e/global-setup.ts',

  // 테스트 파일 위치
  testDir: './e2e',

  // 테스트 결과 출력 디렉토리
  outputDir: './e2e/test-results',

  // 전역 타임아웃 설정
  timeout: ms('5 seconds'),

  // 기대값 타임아웃
  expect: {
    timeout: ms('5 seconds'),
  },

  // 병렬 실행 설정
  fullyParallel: false, // 순차 실행 (DB 상태 의존성)
  workers: 1,

  // 재시도 설정
  retries: process.env.CI ? 2 : 0,

  // 리포터 설정
  reporter: [['list'], ['html', { outputFolder: './e2e/playwright-report', open: 'never' }]],

  // 전역 설정
  use: {
    // 기본 URL (테스트 서버 - 개발 서버와 분리)
    baseURL: `http://localhost:${E2E_TEST_PORT}`,

    // 브라우저 설정
    headless: true,

    // 스크린샷 및 비디오
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',

    // 뷰포트 설정
    viewport: { width: 1280, height: 720 },

    // 로케일
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  },

  // 프로젝트 설정
  projects: [
    // 1. 세션 저장용 setup (먼저 실행)
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // 2. 로그인 테스트 (세션 없이 직접 로그인 테스트)
    {
      name: 'auth-tests',
      testMatch: /pages\/auth\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: undefined, // 세션 없음
      },
    },
    // 3. 나머지 테스트 (저장된 세션 재사용)
    {
      name: 'authenticated',
      testIgnore: [/auth\.setup\.ts/, /pages\/auth\.spec\.ts/],
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
    },
  ],

  // 테스트 서버 실행 설정
  // E2E_DEV=true: 기존 dev 서버 재사용 (빠른 개발 반복)
  // E2E_DEV 없음: production 빌드 후 시작 (전체 테스트/CI)
  webServer: process.env.E2E_DEV
    ? {
        command: `pnpm dotenv -e .env.test.local -- next dev --port ${E2E_TEST_PORT}`,
        url: `http://localhost:${E2E_TEST_PORT}`,
        reuseExistingServer: true,
        timeout: ms('30 seconds'),
        env: { NODE_ENV: 'test' },
      }
    : {
        command: `pnpm dotenv -e .env.test.local -- sh -c "next build && next start --port ${E2E_TEST_PORT}"`,
        url: `http://localhost:${E2E_TEST_PORT}`,
        reuseExistingServer: false,
        timeout: ms('3 minutes'), // 빌드 시간 고려
        env: { NODE_ENV: 'test' },
      },
})

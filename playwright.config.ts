import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import ms from 'ms'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '.env.test.local'), quiet: true })

const E2E_TEST_PORT = 3010

/**
 * Playwright E2E 테스트 설정
 *
 * 실행 방법:
 * - 전체 테스트: pnpm test:e2e
 * - UI 모드: pnpm test:e2e:ui
 * - 특정 파일: pnpm test:e2e e2e/upload.spec.ts
 * - 디버그 모드: pnpm test:e2e:debug
 */
export default defineConfig({
  // 전역 설정 (테스트 전 DB 초기화/시드)
  globalSetup: './e2e/global-setup.ts',

  // 테스트 파일 위치
  testDir: './e2e',

  // 테스트 결과 출력 디렉토리
  outputDir: './e2e/test-results',

  // 전역 타임아웃 설정
  timeout: ms('1 minute'),

  // 기대값 타임아웃
  expect: {
    timeout: ms('10 seconds'),
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

  // 프로젝트 설정 (브라우저별)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // 테스트 서버 실행 설정
  webServer: {
    command: `pnpm dotenv -e .env.test.local -- next dev --port ${E2E_TEST_PORT}`,
    url: `http://localhost:${E2E_TEST_PORT}`,
    reuseExistingServer: false, // 항상 새 서버 시작
    timeout: ms('2 minutes'),
    env: { NODE_ENV: 'test' },
  },
})

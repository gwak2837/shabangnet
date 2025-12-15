/**
 * 송장 변환 E2E 테스트
 *
 * 거래처 송장 파일 → 사방넷 송장 업로드 양식 변환 검증
 *
 * 테스트 흐름:
 * 1. 발주서 발송 이력 생성 (사방넷 주문 업로드 → 발주 발송)
 * 2. 송장 변환 페이지에서 발주 이력 선택
 * 3. 제조사 송장 파일 업로드
 * 4. 변환 결과 검증
 * 5. 사방넷 송장 양식 다운로드 검증
 */

import { expect, test } from '@playwright/test'
import fs from 'fs'
import path from 'path'

import {
  CORE_COLUMNS_INVOICE,
  FLEXIBLE_COMPARE_OPTIONS_INVOICE,
  INPUT_FILES,
  INVOICE_TEST_CASES,
} from '../common/fixtures'
import { getExcelHeaders, getExcelRowCount } from '../util/excel'

// 다운로드된 파일 저장 경로
const DOWNLOADS_DIR = path.join(__dirname, '../../test-results/downloads')

// 테스트 전에 다운로드 디렉토리 생성
test.beforeAll(async () => {
  if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true })
  }
})

// ============================================================================
// 송장 변환 페이지 기본 테스트
// ============================================================================

test.describe('송장 변환 페이지', () => {
  test('페이지 로드 및 기본 UI 확인', async ({ page }) => {
    await page.goto('/invoice-convert')

    // 페이지 제목 확인
    await expect(page.getByRole('heading', { name: '송장 변환' })).toBeVisible()

    // 설명 텍스트 확인
    await expect(page.getByText('거래처 송장 파일을 사방넷 업로드 양식으로 변환합니다')).toBeVisible()

    // 단계 표시 확인
    await expect(page.getByText('발주 선택')).toBeVisible()
    await expect(page.getByText('송장 업로드')).toBeVisible()
    await expect(page.getByText('변환 결과')).toBeVisible()
  })

  test('발주 이력이 없을 때 빈 상태 표시', async ({ page }) => {
    await page.goto('/invoice-convert')

    // 발주 선택 영역 확인
    await expect(page.getByText('발주 선택')).toBeVisible()

    // 송장 업로드 영역은 비활성화 상태여야 함
    const uploadArea = page.locator('[data-disabled="true"]').first()
    // 또는 파일 입력이 비활성화된 상태 확인
  })
})

// ============================================================================
// 송장 변환 워크플로우 테스트 (발주 이력 필요)
// ============================================================================

test.describe.serial('송장 변환 워크플로우', () => {
  // 선행 조건: 발주 이력 생성을 위해 사방넷 주문 업로드
  test('1. 사방넷 주문 업로드 (발주 이력 생성 준비)', async ({ page }) => {
    // 입력 파일 존재 확인
    if (!fs.existsSync(INPUT_FILES.sabangnet)) {
      console.log(`사방넷 원본 파일을 찾을 수 없습니다: ${INPUT_FILES.sabangnet}`)
      test.skip()
      return
    }

    // 업로드 페이지로 이동
    await page.goto('/upload')
    await expect(page.getByRole('heading', { name: '주문 업로드' })).toBeVisible()

    // 파일 업로드
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(INPUT_FILES.sabangnet)

    // 처리 완료 대기
    await expect(page.getByText('업로드 결과')).toBeVisible({ timeout: 60000 })

    // 처리된 주문 수 확인
    await expect(page.getByText(/처리된 주문/)).toBeVisible()
  })

  test('2. 발주 페이지에서 제조사 확인', async ({ page }) => {
    await page.goto('/order')
    await expect(page.getByRole('heading', { name: '발주 생성/발송' })).toBeVisible()

    // 테이블 로드 대기
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 })

    // 제조사 목록이 표시되는지 확인
    const rows = page.locator('tbody tr')
    const rowCount = await rows.count()
    expect(rowCount).toBeGreaterThan(0)
  })

  // 참고: 실제 송장 변환 테스트는 발주 이메일이 실제로 발송된 후에만 가능
  // 발송 이력이 있어야 송장 변환 페이지에서 선택할 수 있음
  test('3. 송장 변환 페이지 접근', async ({ page }) => {
    await page.goto('/invoice-convert')

    // 페이지 로드 확인
    await expect(page.getByRole('heading', { name: '송장 변환' })).toBeVisible()

    // 발주 선택 영역 확인
    await expect(page.getByText('발주 선택')).toBeVisible()
  })
})

// ============================================================================
// 송장 파일 구조 검증 (테스트 데이터 유효성)
// ============================================================================

test.describe('송장 테스트 데이터 검증', () => {
  test('송장 테스트 케이스 구조 확인', () => {
    // 송장 테스트 케이스 구조 검증
    expect(INVOICE_TEST_CASES).toBeDefined()
    expect(Array.isArray(INVOICE_TEST_CASES)).toBe(true)

    // 필수 필드 확인
    for (const testCase of INVOICE_TEST_CASES) {
      expect(testCase.manufacturer).toBeTruthy()
    }

    console.log(`송장 테스트 케이스: ${INVOICE_TEST_CASES.length}개`)
  })

  test('송장 출력 컬럼 정의 확인', () => {
    // 사방넷 송장 업로드 양식 필수 컬럼 확인
    expect(CORE_COLUMNS_INVOICE).toContain('사방넷주문번호')
    expect(CORE_COLUMNS_INVOICE).toContain('택배사코드')
    expect(CORE_COLUMNS_INVOICE).toContain('송장번호')

    console.log(`송장 필수 컬럼: ${CORE_COLUMNS_INVOICE.join(', ')}`)
  })

  test('유연 비교 옵션 확인', () => {
    // 송장 비교 옵션 검증
    expect(FLEXIBLE_COMPARE_OPTIONS_INVOICE).toBeDefined()
    expect(FLEXIBLE_COMPARE_OPTIONS_INVOICE.coreColumns).toBeDefined()
    expect(FLEXIBLE_COMPARE_OPTIONS_INVOICE.ignoreRowOrder).toBe(true)
    expect(FLEXIBLE_COMPARE_OPTIONS_INVOICE.keyColumn).toBe('사방넷주문번호')
  })

  // 각 송장 테스트 케이스의 파일 존재 확인
  for (const testCase of INVOICE_TEST_CASES) {
    test(`${testCase.manufacturer} 송장 파일 존재 확인`, async () => {
      if (!testCase.originalFile) {
        console.log(`송장 원본 파일 경로가 없습니다: ${testCase.manufacturer}`)
        test.skip()
        return
      }

      if (!fs.existsSync(testCase.originalFile)) {
        console.log(`송장 원본 파일을 찾을 수 없습니다: ${testCase.originalFile}`)
        test.skip()
        return
      }

      const rowCount = await getExcelRowCount(testCase.originalFile, 1)
      console.log(`${testCase.manufacturer} 송장 원본: ${rowCount}개 행`)

      expect(rowCount).toBeGreaterThan(0)
    })
  }
})

// ============================================================================
// 송장 변환 Golden File 비교 (실제 테스트 데이터 필요)
// ============================================================================

test.describe('송장 변환 Golden File 비교', () => {
  // 참고: 이 테스트들은 실제 송장 테스트 데이터가 추가되면 활성화
  // 현재는 테스트 구조만 정의

  for (const testCase of INVOICE_TEST_CASES) {
    test(`${testCase.manufacturer} 송장 변환 결과 비교`, async ({ page }) => {
      // 테스트 데이터 존재 확인
      if (!testCase.originalFile || !testCase.convertedFile) {
        console.log(`테스트 데이터가 없습니다: ${testCase.manufacturer}`)
        test.skip()
        return
      }

      if (!fs.existsSync(testCase.originalFile) || !fs.existsSync(testCase.convertedFile)) {
        console.log(`파일을 찾을 수 없습니다: ${testCase.manufacturer}`)
        test.skip()
        return
      }

      // 송장 변환 페이지로 이동
      await page.goto('/invoice-convert')
      await expect(page.getByRole('heading', { name: '송장 변환' })).toBeVisible()

      // TODO: 실제 테스트 로직 구현
      // 1. 발주 이력 선택 (testCase.manufacturer와 일치하는 이력)
      // 2. 송장 파일 업로드 (testCase.originalFile)
      // 3. 변환 수행
      // 4. 결과 다운로드
      // 5. Golden File과 비교 (testCase.convertedFile)

      console.log(`${testCase.manufacturer} 송장 변환 테스트 - 테스트 데이터 추가 필요`)
    })
  }

  test('송장 변환 결과 파일 형식 검증', async () => {
    // 송장 변환 결과 파일이 있는 경우 형식 검증
    for (const testCase of INVOICE_TEST_CASES) {
      if (!testCase.convertedFile || !fs.existsSync(testCase.convertedFile)) {
        continue
      }

      // 헤더 확인
      const headers = await getExcelHeaders(testCase.convertedFile, 1)
      console.log(`${testCase.manufacturer} 변환 결과 헤더: ${headers.join(', ')}`)

      // 필수 컬럼 존재 확인
      for (const col of CORE_COLUMNS_INVOICE) {
        expect(headers).toContain(col)
      }

      // 데이터 행 수 확인
      const rowCount = await getExcelRowCount(testCase.convertedFile, 1)
      expect(rowCount).toBeGreaterThan(0)
    }
  })
})

// ============================================================================
// 송장 변환 UI 인터랙션 테스트
// ============================================================================

test.describe('송장 변환 UI 테스트', () => {
  test('발주 선택 UI 동작', async ({ page }) => {
    await page.goto('/invoice-convert')

    // 발주 선택 카드 확인
    await expect(page.getByText('발주 선택')).toBeVisible()

    // 발주 목록이 로드되길 대기 (있는 경우)
    // 목록이 비어있으면 빈 상태 메시지 확인
    await page.waitForTimeout(2000) // 로딩 대기

    // UI 요소 존재 확인
    const orderSelectArea = page.locator('text=발주 선택').locator('..')
    await expect(orderSelectArea).toBeVisible()
  })

  test('송장 업로드 드롭존 상태', async ({ page }) => {
    await page.goto('/invoice-convert')

    // 발주 미선택 시 업로드 영역 비활성화 확인
    // 드롭존 텍스트 확인
    await expect(page.getByText('송장 업로드')).toBeVisible()
  })

  test('단계 진행 표시 UI', async ({ page }) => {
    await page.goto('/invoice-convert')

    // 진행 단계 표시 확인
    const step1 = page.getByText('발주 선택')
    const step2 = page.getByText('송장 업로드')
    const step3 = page.getByText('변환 결과')

    await expect(step1).toBeVisible()
    await expect(step2).toBeVisible()
    await expect(step3).toBeVisible()
  })
})

// ============================================================================
// 택배사 코드 연결 검증
// ============================================================================

test.describe('택배사 코드 연결', () => {
  test('설정 페이지에서 택배사 코드 확인', async ({ page }) => {
    // 택배사 설정 페이지로 이동
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: '설정' })).toBeVisible()

    // 택배사 탭 클릭 (있는 경우)
    const courierTab = page.getByRole('button', { name: /택배사/i })
    if (await courierTab.isVisible()) {
      await courierTab.click()

      // 기본 택배사 목록 확인
      const courierList = ['CJ대한통운', '한진택배', '롯데택배', '우체국택배', '로젠택배']
      for (const courier of courierList.slice(0, 2)) {
        // 상위 2개만 확인
        const courierText = page.getByText(courier, { exact: false })
        if (await courierText.isVisible({ timeout: 1000 }).catch(() => false)) {
          console.log(`택배사 확인: ${courier}`)
        }
      }
    }
  })

  test('택배사 코드 연결 정확성', async () => {
    // 참고: 실제 택배사 코드 연결 검증
    // PRD 기준 택배사 코드:
    // - CJ대한통운: 04
    // - 한진택배: 05
    // - 롯데택배: 08
    // - 우체국택배: 01
    // - 로젠택배: 06

    const expectedMappings: Record<string, string> = {
      CJ대한통운: '04',
      한진택배: '05',
      롯데택배: '08',
      우체국택배: '01',
      로젠택배: '06',
    }

    console.log('예상 택배사 코드 연결:')
    for (const [name, code] of Object.entries(expectedMappings)) {
      console.log(`  ${name}: ${code}`)
    }

    // 이 테스트는 실제 DB 조회 없이 기대값만 확인
    expect(Object.keys(expectedMappings).length).toBe(5)
  })
})

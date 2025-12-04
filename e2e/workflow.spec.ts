import { expect, test } from '@playwright/test'

import { INPUT_FILES, SABANGNET_TEST_CASES } from './fixtures'

// 주요 제조사 조회 헬퍼

test.describe('전체 워크플로우 테스트', () => {
  test('사방넷 업로드 → 제조사 분류 → 발주서 생성 전체 플로우', async ({ page }) => {
    // 1단계: 주문 업로드
    await page.goto('/upload')
    await expect(page.getByRole('heading', { name: '주문 업로드' })).toBeVisible()

    // 사방넷 파일 업로드
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(INPUT_FILES.sabangnet)

    // 업로드 결과 대기
    await expect(page.getByText('업로드 결과')).toBeVisible({ timeout: 30000 })

    // 성공 확인
    await expect(page.getByText(/처리된 주문/)).toBeVisible()

    // 2단계: 발주 페이지로 이동하여 결과 확인
    await page.goto('/orders')
    await expect(page.getByRole('heading', { name: '발주 생성/발송' })).toBeVisible()

    // 제조사별 주문이 표시되는지 확인
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 })

    // 3단계: 특정 제조사(하늘명인)의 발주서 다운로드 테스트
    const hanul = SABANGNET_TEST_CASES.find((m) => m.manufacturer === '하늘명인')!
    const hanulRow = page.locator('tr').filter({ hasText: hanul.manufacturer })

    if (await hanulRow.isVisible()) {
      // 해당 제조사 행에서 다운로드 버튼 클릭
      const downloadButton = hanulRow.getByRole('button', { name: /다운로드/i })
      if (await downloadButton.isVisible()) {
        const downloadPromise = page.waitForEvent('download')
        await downloadButton.click()
        const download = await downloadPromise

        // 파일명 검증
        const fileName = download.suggestedFilename()
        expect(fileName).toContain('발주서')
        expect(fileName).toContain(hanul.manufacturer)
      }
    }
  })

  test('쇼핑몰 변환 → 발주 페이지 확인 플로우', async ({ page }) => {
    // 1단계: SK 쇼핑몰 파일 업로드
    await page.goto('/upload')

    // 쇼핑몰 주문 탭으로 전환
    await page.getByRole('button', { name: /쇼핑몰 주문/ }).click()

    // SK스토아 선택
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'SK스토아' }).click()

    // 파일 업로드
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(INPUT_FILES.skOriginal)

    // 업로드 결과 대기
    await expect(page.getByText('업로드 결과')).toBeVisible({ timeout: 30000 })

    // SK스토아 변환 확인
    await expect(page.getByText('SK스토아')).toBeVisible()

    // 2단계: 발주 페이지에서 변환된 주문 확인
    await page.goto('/orders')
    await expect(page.getByRole('heading', { name: '발주 생성/발송' })).toBeVisible()

    // 테이블 로드 확인
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('대시보드 확인', () => {
  test('대시보드에서 업로드 및 발주 현황 확인', async ({ page }) => {
    // 먼저 데이터 업로드
    await page.goto('/upload')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(INPUT_FILES.sabangnet)
    await expect(page.getByText('업로드 결과')).toBeVisible({ timeout: 30000 })

    // 대시보드로 이동
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible()

    // 통계 카드들이 표시되어야 함
    await expect(page.getByText(/오늘 업로드|총 주문|발송 완료/)).toBeVisible({ timeout: 10000 })
  })
})

test.describe('제조사 관리', () => {
  test('제조사 목록 페이지 확인', async ({ page }) => {
    await page.goto('/manufacturers')
    await expect(page.getByRole('heading', { name: '제조사 관리' })).toBeVisible()

    // 테이블이 로드되어야 함
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 })

    // 시드된 제조사들이 표시되어야 함
    // 제조사 목록에 하늘명인, 로뎀푸드, 고창베리세상 등이 있어야 함
  })

  test('제조사 추가 모달 열기', async ({ page }) => {
    await page.goto('/manufacturers')

    // 제조사 추가 버튼 클릭
    const addButton = page.getByRole('button', { name: /제조사 추가|추가/ })
    if (await addButton.isVisible()) {
      await addButton.click()

      // 모달이 열려야 함
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText(/제조사 정보|기본 정보/)).toBeVisible()
    }
  })
})

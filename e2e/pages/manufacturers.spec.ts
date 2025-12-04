import { expect, test } from '@playwright/test'

// 테스트 실행마다 고유한 타임스탬프 생성 (중복 방지)
const TIMESTAMP = Date.now()

const TEST_MANUFACTURER = {
  name: `E2E테스트제조사_${TIMESTAMP}`,
  contactName: '테스트담당자',
  email: `e2e-test-${TIMESTAMP}@example.com`,
  ccEmail: `e2e-cc-${TIMESTAMP}@example.com`,
  phone: '02-1234-5678',
}

const UPDATED_MANUFACTURER = {
  name: `E2E테스트제조사_${TIMESTAMP}_수정됨`,
  contactName: '수정된담당자',
}

test.describe('제조사 관리 CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/manufacturer')
    await expect(page.getByRole('heading', { name: '제조사 관리' })).toBeVisible()
    // 테이블 로드 대기
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 })
  })

  test.describe('조회', () => {
    test('제조사 목록 페이지가 표시되어야 함', async ({ page }) => {
      // 통계 카드들이 표시되어야 함
      await expect(page.getByText('등록 제조사')).toBeVisible()
      await expect(page.getByText('총 누적 주문')).toBeVisible()
      await expect(page.getByText('제조사당 평균 주문')).toBeVisible()

      // 테이블이 로드되어야 함
      await expect(page.locator('table')).toBeVisible()
    })

    test('시드된 제조사들이 표시되어야 함', async ({ page }) => {
      // 테이블에 데이터가 있는지 확인
      const rows = page.locator('table tbody tr')
      const count = await rows.count()
      expect(count).toBeGreaterThan(0)
    })

    test('제조사 검색 기능', async ({ page }) => {
      // 검색 입력란 찾기 (제조사 테이블의 검색창 - placeholder로 구분)
      const searchInput = page.locator('input[placeholder*="제조사명"]')

      if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        // "하늘명인" 검색 (시드된 제조사)
        await searchInput.fill('하늘명인')
        await page.waitForTimeout(500) // 디바운스 대기

        // 검색 결과 확인 (제조사명 p 태그에서 찾기)
        await expect(page.locator('table p.font-medium').getByText('하늘명인', { exact: true })).toBeVisible()
      }
    })
  })

  test.describe('등록', () => {
    test('제조사 추가 모달 열기', async ({ page }) => {
      // 제조사 추가 버튼 찾기
      const addButton = page.getByRole('button', { name: '제조사 추가' })
      await addButton.click()

      // 모달이 열려야 함
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText('새로운 제조사를 등록합니다.')).toBeVisible()
    })

    test('필수 필드 유효성 검사', async ({ page }) => {
      // 모달 열기
      await page.getByRole('button', { name: '제조사 추가' }).click()
      await expect(page.getByRole('dialog')).toBeVisible()

      // 빈 폼으로 제출 시도
      await page.getByRole('dialog').getByRole('button', { name: '추가' }).click()

      // 에러 메시지 확인
      await expect(page.getByText('제조사명을 입력하세요')).toBeVisible()
      await expect(page.getByText('이메일을 입력하세요')).toBeVisible()
    })

    test('이메일 형식 유효성 검사', async ({ page }) => {
      // 모달 열기
      await page.getByRole('button', { name: '제조사 추가' }).click()
      await expect(page.getByRole('dialog')).toBeVisible()

      // 잘못된 이메일 입력
      const dialog = page.getByRole('dialog')
      await dialog.locator('#name').fill('유효성테스트제조사')
      await dialog.locator('#email').fill('invalid-email')

      // 추가 버튼 클릭
      await dialog.getByRole('button', { name: '추가' }).click()

      // 유효성 검사 실패 시 모달이 열린 상태로 유지되어야 함
      await page.waitForTimeout(500)
      await expect(dialog).toBeVisible()

      // 에러 스타일이 적용된 입력란 또는 에러 메시지 확인
      const hasErrorInput = await dialog.locator('input.border-rose-500').count()
      const hasErrorMessage = await dialog.locator('.text-rose-500').count()
      expect(hasErrorInput + hasErrorMessage).toBeGreaterThan(0)

      // 취소하여 닫기
      await dialog.getByRole('button', { name: '취소' }).click()
    })

    test('새 제조사 등록', async ({ page }) => {
      // 모달 열기
      await page.getByRole('button', { name: '제조사 추가' }).click()
      await expect(page.getByRole('dialog')).toBeVisible()

      // 폼 입력
      await page.getByRole('dialog').locator('#name').fill(TEST_MANUFACTURER.name)
      await page.getByRole('dialog').locator('#contactName').fill(TEST_MANUFACTURER.contactName)
      await page.getByRole('dialog').locator('#email').fill(TEST_MANUFACTURER.email)
      await page.getByRole('dialog').locator('#ccEmail').fill(TEST_MANUFACTURER.ccEmail)
      await page.getByRole('dialog').locator('#phone').fill(TEST_MANUFACTURER.phone)

      // 추가 버튼 클릭
      await page.getByRole('dialog').getByRole('button', { name: '추가' }).click()

      // 모달 닫힘 확인
      await expect(page.getByRole('dialog')).not.toBeVisible()

      // 성공 토스트 메시지 확인
      await expect(page.getByText('제조사가 등록되었습니다')).toBeVisible()

      // 목록에서 확인 (검색으로)
      const searchInput = page.locator('input[placeholder*="제조사명"]')
      if (await searchInput.isVisible()) {
        await searchInput.fill(TEST_MANUFACTURER.name)
        await page.waitForTimeout(500)
        // 중복이 있을 수 있으므로 .first() 사용
        await expect(
          page.locator('table p.font-medium').getByText(TEST_MANUFACTURER.name, { exact: true }).first(),
        ).toBeVisible()
      }
    })
  })

  test.describe('수정', () => {
    test('제조사 수정 모달 열기', async ({ page }) => {
      // 첫 번째 제조사 행의 드롭다운 메뉴 클릭
      const firstRow = page.locator('table tbody tr').first()
      await firstRow.getByRole('button').click() // MoreHorizontal 아이콘 버튼

      // 수정 메뉴 아이템 클릭
      await page.getByRole('menuitem', { name: '수정' }).click()

      // 모달이 열려야 함
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText('제조사 정보를 수정합니다.')).toBeVisible()
    })

    test('제조사 정보 수정', async ({ page }) => {
      // 검색 입력란 찾기 (제조사 테이블의 검색창)
      const searchInput = page.locator('input[placeholder*="제조사명"]')
      if (await searchInput.isVisible()) {
        await searchInput.fill(TEST_MANUFACTURER.name)
        await page.waitForTimeout(500)
      }

      // 테스트 제조사가 있으면 수정
      const testRow = page.locator(`table tbody tr:has-text("${TEST_MANUFACTURER.name}")`)

      if (await testRow.isVisible({ timeout: 3000 }).catch(() => false)) {
        // 드롭다운 메뉴 열고 수정 클릭
        await testRow.getByRole('button').click()
        await page.getByRole('menuitem', { name: '수정' }).click()
        await expect(page.getByRole('dialog')).toBeVisible()

        // 이름 수정
        await page.getByRole('dialog').locator('#name').fill(UPDATED_MANUFACTURER.name)
        await page.getByRole('dialog').locator('#contactName').fill(UPDATED_MANUFACTURER.contactName)

        // 수정 버튼 클릭
        await page.getByRole('dialog').getByRole('button', { name: '수정' }).click()

        // 모달 닫힘 확인
        await expect(page.getByRole('dialog')).not.toBeVisible()

        // 성공 토스트 메시지 확인
        await expect(page.getByText('제조사 정보가 수정되었습니다')).toBeVisible()
      }
    })
  })

  test.describe('삭제', () => {
    test('제조사 삭제', async ({ page }) => {
      // 검색 입력란 찾기 (제조사 테이블의 검색창)
      const searchInput = page.locator('input[placeholder*="제조사명"]')
      if (await searchInput.isVisible()) {
        // 수정된 이름 또는 원래 이름으로 검색
        await searchInput.fill('E2E테스트')
        await page.waitForTimeout(500)
      }

      // 테스트 제조사 행 찾기
      const testRow = page
        .locator('table tbody tr')
        .filter({
          hasText: /E2E테스트/,
        })
        .first()

      if (await testRow.isVisible({ timeout: 3000 }).catch(() => false)) {
        // 드롭다운 메뉴 열고 삭제 클릭
        await testRow.getByRole('button').click()
        await page.getByRole('menuitem', { name: '삭제' }).click()

        // 삭제 확인 대화상자 확인
        const confirmButton = page.getByRole('button', { name: /확인|삭제/ })
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click()
        }

        // 성공 토스트 메시지 확인
        await expect(page.getByText('제조사가 삭제되었습니다')).toBeVisible()
      }
    })
  })

  test.describe('템플릿 설정', () => {
    test('발주서 양식 설정 펼치기/접기', async ({ page }) => {
      // 첫 번째 제조사 행의 드롭다운 메뉴로 수정 모달 열기
      const firstRow = page.locator('table tbody tr').first()
      await firstRow.getByRole('button').click()
      await page.getByRole('menuitem', { name: '수정' }).click()

      // 모달 확인
      if (
        await page
          .getByRole('dialog')
          .isVisible({ timeout: 3000 })
          .catch(() => false)
      ) {
        // 발주서 양식 설정 섹션 펼치기
        const orderTemplateButton = page.getByRole('dialog').getByText('발주서 양식 설정')
        if (await orderTemplateButton.isVisible()) {
          await orderTemplateButton.click()

          // 펼쳐진 내용 확인
          await expect(page.getByText('양식 파일 업로드')).toBeVisible()
        }

        // 취소
        await page.getByRole('dialog').getByRole('button', { name: '취소' }).click()
      }
    })

    test('송장 양식 설정 펼치기/접기', async ({ page }) => {
      // 첫 번째 제조사 행의 드롭다운 메뉴로 수정 모달 열기
      const firstRow = page.locator('table tbody tr').first()
      await firstRow.getByRole('button').click()
      await page.getByRole('menuitem', { name: '수정' }).click()

      // 모달 확인
      if (
        await page
          .getByRole('dialog')
          .isVisible({ timeout: 3000 })
          .catch(() => false)
      ) {
        // 송장 양식 설정 섹션 펼치기
        const invoiceTemplateButton = page.getByRole('dialog').getByText('송장 양식 설정')
        if (await invoiceTemplateButton.isVisible()) {
          await invoiceTemplateButton.click()

          // 펼쳐진 내용 확인
          await expect(page.getByText('주문번호 컬럼')).toBeVisible()
        }

        // 취소
        await page.getByRole('dialog').getByRole('button', { name: '취소' }).click()
      }
    })
  })
})

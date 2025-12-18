import { expect, test } from '@playwright/test'

// 테스트 실행마다 고유한 타임스탬프 생성 (중복 키 방지)
const TIMESTAMP = Date.now()

const TEST_COURIER = {
  name: `E2E테스트택배_${TIMESTAMP}`,
  code: '99',
  aliases: [`E2E택배_${TIMESTAMP}`, `E2E운송_${TIMESTAMP}`],
}

const TEST_EXCLUSION_PATTERN = {
  pattern: `[E2E]테스트_제외패턴_${TIMESTAMP}`,
  description: 'E2E 테스트용 제외 패턴',
}

test.describe('설정 > 주문 처리', () => {
  test('설정 페이지가 열려야 함', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: '설정' })).toBeVisible({ timeout: 10000 })
    await expect(page.locator('#order')).toBeVisible()
  })

  test.describe('택배사 연결', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/settings/courier')
      await expect(page.getByRole('heading', { name: '택배사' })).toBeVisible({ timeout: 10000 })
    })

    test('택배사 목록이 표시되어야 함', async ({ page }) => {
      // 시드된 택배사 중 하나가 보여야 함 (카드 아이템에서 찾기)
      await expect(page.getByText('CJ대한통운').first()).toBeVisible()
    })

    test('새 택배사 추가', async ({ page }) => {
      // 추가 버튼 클릭
      await page.getByRole('button', { name: '추가' }).click()

      // 모달 확인
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText('새 택배사')).toBeVisible()

      // 폼 입력
      await page.getByRole('dialog').locator('#courier-name').fill(TEST_COURIER.name)
      await page.getByRole('dialog').locator('#courier-code').fill(TEST_COURIER.code)

      // 별칭 추가
      for (const alias of TEST_COURIER.aliases) {
        await page.getByRole('dialog').locator('input[name="alias"]').fill(alias)
        await page.getByRole('dialog').getByRole('button', { name: '추가', exact: true }).click()
        await expect(page.getByRole('dialog').getByText(alias)).toBeVisible()
      }

      // 저장
      await page.getByRole('dialog').getByRole('button', { name: '저장' }).click()

      // 모달 닫힘 확인
      await expect(page.getByRole('dialog')).not.toBeVisible()

      // 목록에 추가된 택배사 확인
      await expect(page.getByText(TEST_COURIER.name).first()).toBeVisible()
    })

    test('택배사 수정', async ({ page }) => {
      // 첫 번째 택배사 아이템의 수정 버튼 클릭
      await page.locator('svg.lucide-pencil').first().locator('..').click()

      // 모달 확인
      await expect(page.getByRole('dialog')).toBeVisible()

      // 이름 수정
      const nameInput = page.getByRole('dialog').locator('#courier-name')
      const currentName = await nameInput.inputValue()
      await nameInput.fill(`${currentName}_수정됨`)

      // 저장
      await page.getByRole('dialog').getByRole('button', { name: '저장' }).click()

      // 변경 확인
      await expect(page.getByText(`${currentName}_수정됨`).first()).toBeVisible()
    })

    test('택배사 활성화/비활성화 토글', async ({ page }) => {
      const toggle = page.locator('button[role="switch"]').first()
      const initialState = await toggle.getAttribute('data-state')

      // 토글 클릭
      await toggle.click()
      await expect(page.getByText('택배사 연결이 수정됐어요').first()).toBeVisible()

      // 네트워크 요청 완료 및 데이터 상태 변경 대기
      await page.waitForLoadState('networkidle')
      await expect(toggle).toHaveAttribute('data-state', initialState === 'checked' ? 'unchecked' : 'checked')

      // 다시 토글해서 원래 상태로 복원
      await toggle.click()
      await expect(page.getByText('택배사 연결이 수정됐어요').first()).toBeVisible()
    })

    test('택배사 삭제', async ({ page }) => {
      // 삭제 버튼 클릭 (휴지통 아이콘)
      const testCourierRow = page.getByText(TEST_COURIER.name).first().locator('xpath=ancestor::div[1]')
      await testCourierRow.locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).click()

      // 삭제 확인
      await expect(page.getByText(TEST_COURIER.name)).not.toBeVisible()
    })
  })

  test.describe('발송 제외 패턴', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/settings/exclusion')
      await expect(page.getByRole('heading', { name: '발송 제외 설정' })).toBeVisible({ timeout: 10000 })
    })

    test('제외 패턴 목록이 표시되어야 함', async ({ page }) => {
      // 시드된 패턴 중 하나가 보여야 함
      await expect(page.getByText('[30002002]주문_센터택배').first()).toBeVisible()
    })

    test('새 제외 패턴 추가', async ({ page }) => {
      const addForm = page.locator('form').filter({ has: page.locator('input[name="pattern"]') })

      await addForm.locator('input[name="pattern"]').fill(TEST_EXCLUSION_PATTERN.pattern)
      await addForm.locator('input[name="description"]').fill(TEST_EXCLUSION_PATTERN.description)
      await addForm.getByRole('button', { name: '추가' }).click()

      // 추가된 패턴 확인 (중복 요소가 있을 수 있으므로 .first() 사용)
      await expect(page.getByText(TEST_EXCLUSION_PATTERN.pattern).first()).toBeVisible()
    })

    test('제외 패턴 수정', async ({ page }) => {
      await page.locator('svg.lucide-pencil').first().locator('..').click()

      // 모달 확인
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText('패턴 편집')).toBeVisible()

      // 설명 수정
      await page.getByRole('dialog').locator('#edit-description').fill('수정된 설명')

      // 저장
      await page.getByRole('dialog').getByRole('button', { name: '저장' }).click()

      // 모달 닫힘 확인
      await expect(page.getByRole('dialog')).not.toBeVisible()
    })

    test('제외 패턴 활성화/비활성화 토글', async ({ page }) => {
      // 메인 토글이 활성화되어 있어야 개별 패턴 토글을 클릭할 수 있음
      const mainToggle = page.locator('label').filter({ hasText: '자동 필터링 사용' }).locator('button[role="switch"]')
      const isMainEnabled = (await mainToggle.getAttribute('data-state')) === 'checked'

      // 메인 토글이 비활성화되어 있으면 먼저 활성화
      if (!isMainEnabled) {
        await mainToggle.click()
        await expect(page.getByText('설정이 저장됐어요').first()).toBeVisible()
        await page.waitForLoadState('networkidle')
        await expect(mainToggle).toHaveAttribute('data-state', 'checked')
      }

      // 첫 번째 패턴의 토글 스위치
      const toggle = page.locator('button[role="switch"]').nth(1)
      const initialState = await toggle.getAttribute('data-state')

      // 토글 클릭
      await toggle.click()
      await expect(page.getByText('패턴이 수정됐어요').first()).toBeVisible()

      // 네트워크 요청 완료 및 데이터 상태 변경 대기
      await page.waitForLoadState('networkidle')
      await expect(toggle).toHaveAttribute('data-state', initialState === 'checked' ? 'unchecked' : 'checked')

      // 다시 토글해서 원래 상태로 복원
      await toggle.click()
      await expect(page.getByText('패턴이 수정됐어요').first()).toBeVisible()
    })

    test('발송 제외 필터 전체 활성화/비활성화', async ({ page }) => {
      const mainToggle = page.locator('label').filter({ hasText: '자동 필터링 사용' }).locator('button[role="switch"]')
      const initialState = await mainToggle.getAttribute('data-state')

      // 전체 활성화 토글
      await mainToggle.click()
      await expect(page.getByText('설정이 저장됐어요', { exact: true }).first()).toBeVisible()

      // 네트워크 요청 완료 및 데이터 상태 변경 대기
      await page.waitForLoadState('networkidle')
      await expect(mainToggle).toHaveAttribute('data-state', initialState === 'checked' ? 'unchecked' : 'checked')

      // 다시 토글해서 원래 상태로 복원
      await mainToggle.click()
      await expect(page.getByText('설정이 저장됐어요', { exact: true }).first()).toBeVisible()
    })
  })

  test.describe('쇼핑몰 템플릿', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/settings/shopping-mall-template')
      await expect(page.getByRole('heading', { name: '쇼핑몰 템플릿' })).toBeVisible({ timeout: 10000 })
    })

    test('쇼핑몰 템플릿 목록이 표시되어야 함', async ({ page }) => {
      await expect(page.getByRole('heading', { name: '쇼핑몰 템플릿' })).toBeVisible()
    })

    test('쇼핑몰 템플릿 추가 모달 열기', async ({ page }) => {
      // 쇼핑몰 템플릿 섹션의 추가 버튼 클릭
      await page.getByRole('button', { name: '추가' }).click()

      // 모달 확인
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText('쇼핑몰 정보와 컬럼 연결을 설정합니다')).toBeVisible()

      // 쇼핑몰 ID 입력
      await page.getByRole('dialog').locator('#mall-name').fill('e2e_test_mall')
      await page.getByRole('dialog').locator('#display-name').fill('E2E테스트몰')

      // 취소
      await page.getByRole('dialog').getByRole('button', { name: '취소' }).click()
      await expect(page.getByRole('dialog')).not.toBeVisible()
    })

    test('기존 쇼핑몰 템플릿 수정 모달 열기', async ({ page }) => {
      // 수정 버튼 클릭 (Pencil 아이콘)
      await page.locator('svg.lucide-pencil').first().locator('..').click()

      // 모달 확인
      await expect(page.getByRole('dialog')).toBeVisible()

      // 취소
      await page.getByRole('dialog').getByRole('button', { name: '취소' }).click()
    })

    test('쇼핑몰 템플릿 활성화/비활성화 토글', async ({ page }) => {
      const toggle = page.locator('button[role="switch"]').first()
      const initialState = await toggle.getAttribute('data-state')

      // 토글 클릭 (비활성화)
      await toggle.click()
      await expect(page.getByText('쇼핑몰 템플릿이 수정됐어요').first()).toBeVisible()

      // 네트워크 요청 완료 및 데이터 상태 변경 대기
      await page.waitForLoadState('networkidle')
      await expect(toggle).toHaveAttribute('data-state', initialState === 'checked' ? 'unchecked' : 'checked')

      // 다시 토글해서 원래 상태로 복원
      await toggle.click()
      await expect(page.getByText('쇼핑몰 템플릿이 수정됐어요').first()).toBeVisible()
    })
  })
})

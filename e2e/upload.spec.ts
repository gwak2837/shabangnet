import { expect, test, TEST_FILES, TEST_MANUFACTURERS } from './fixtures'

test.describe('주문 업로드', () => {
  test('사방넷 원본 파일 업로드 및 파싱', async ({ page }) => {
    // 1. 업로드 페이지로 이동
    await page.goto('/upload')
    await expect(page.getByRole('heading', { name: '주문 업로드' })).toBeVisible()

    // 2. 사방넷 주문 탭이 선택되어 있는지 확인
    const sabangnetTab = page.getByRole('button', { name: /사방넷 주문/ })
    await expect(sabangnetTab).toBeVisible()

    // 3. 파일 업로드
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(TEST_FILES.sabangnet)

    // 4. 처리 완료 대기
    await expect(page.getByText('파일을 분석하고 있습니다')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('업로드 결과')).toBeVisible({ timeout: 30000 })

    // 5. 업로드 결과 확인
    // 성공적으로 처리된 주문 수 확인
    await expect(page.getByText(/처리된 주문/)).toBeVisible()

    // 6. 제조사별 분류 결과 확인
    // 고창베리세상, 로뎀푸드, 하늘명인 등 주요 제조사가 표시되어야 함 (exact: true로 정확한 텍스트만)
    await expect(page.getByText(TEST_MANUFACTURERS.gochang.name, { exact: true })).toBeVisible()
    await expect(page.getByText(TEST_MANUFACTURERS.rodem.name, { exact: true })).toBeVisible()
    await expect(page.getByText(TEST_MANUFACTURERS.hanul.name, { exact: true })).toBeVisible()
  })

  test('SK 쇼핑몰 파일 업로드 및 사방넷 양식 변환', async ({ page }) => {
    // 1. 업로드 페이지로 이동
    await page.goto('/upload')

    // 2. 쇼핑몰 주문 탭으로 전환
    await page.getByRole('button', { name: /쇼핑몰 주문/ }).click()

    // 3. SK스토아 선택
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'SK스토아' }).click()

    // 4. 파일 업로드
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(TEST_FILES.skOriginal)

    // 5. 처리 완료 대기
    await expect(page.getByText('업로드 결과')).toBeVisible({ timeout: 30000 })

    // 6. 변환 결과 확인 - SK스토아 뱃지 표시
    await expect(page.getByText('SK스토아')).toBeVisible()
  })

  test('삼성복지몰 파일 업로드 및 변환', async ({ page }) => {
    await page.goto('/upload')

    // 쇼핑몰 주문 탭으로 전환
    await page.getByRole('button', { name: /쇼핑몰 주문/ }).click()

    // 삼성복지몰 선택
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: '삼성복지몰' }).click()

    // 파일 업로드
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(TEST_FILES.samsungWelfare)

    // 처리 완료 대기
    await expect(page.getByText('업로드 결과')).toBeVisible({ timeout: 30000 })

    // 삼성복지몰 뱃지 표시 확인
    await expect(page.getByText('삼성복지몰')).toBeVisible()
  })

  test('삼성카드몰 파일 업로드 및 변환', async ({ page }) => {
    await page.goto('/upload')

    // 쇼핑몰 주문 탭으로 전환
    await page.getByRole('button', { name: /쇼핑몰 주문/ }).click()

    // 삼성카드몰 선택
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: '삼성카드몰' }).click()

    // 파일 업로드
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(TEST_FILES.samsungCard)

    // 처리 완료 대기
    await expect(page.getByText('업로드 결과')).toBeVisible({ timeout: 30000 })

    // 삼성카드몰 뱃지 표시 확인
    await expect(page.getByText('삼성카드몰')).toBeVisible()
  })
})

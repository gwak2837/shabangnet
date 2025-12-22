import { expect, type Page, type Route, test } from '@playwright/test'
import fs from 'fs'
import path from 'path'

import { FLEXIBLE_COMPARE_OPTIONS_ORDER_BASE, INPUT_FILES, ORDER_GOLDEN_DIR } from '../common/fixtures'
import { flexibleCompareExcelFiles, formatFlexibleCompareResult } from '../util/excel'

const DOWNLOADS_DIR = path.join(__dirname, '../test-results/downloads')
const UPDATE_GOLDEN = process.env.E2E_UPDATE_GOLDEN === 'true'
const EXPECTED_GOLDEN_COUNT = 42

test.beforeAll(async () => {
  if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true })
  }

  if (!fs.existsSync(ORDER_GOLDEN_DIR)) {
    fs.mkdirSync(ORDER_GOLDEN_DIR, { recursive: true })
  }
})

test.describe('발주 생성 / 발송 대상', () => {
  test('제조사별 발주서 다운로드 결과가 Golden과 일치해요', async ({ page }) => {
    test.setTimeout(5 * 60_000)

    await uploadSabangnet(page)

    await page.goto('/order/sendable')
    await expect(page.locator('table')).toBeVisible({ timeout: 30_000 })

    await loadAllOrderBatches(page)

    const batchRows = page.locator('tbody tr').filter({ has: page.locator('button[title="작업 메뉴"]') })
    const totalRows = await batchRows.count()
    expect(totalRows).toBeGreaterThan(0)

    // Golden 갱신 모드에서는 기존 파일을 비워서 "현재 입력/로직" 기준으로만 생성해요.
    if (UPDATE_GOLDEN) {
      for (const name of fs.readdirSync(ORDER_GOLDEN_DIR)) {
        if (!name.toLowerCase().endsWith('.xlsx')) continue
        if (name.startsWith('~') || name === '.DS_Store') continue
        fs.rmSync(path.join(ORDER_GOLDEN_DIR, name))
      }
    }

    // Golden(기대) 파일 전수 기준으로 누락이 없도록 보장해요.
    const expectedFileNames = fs
      .readdirSync(ORDER_GOLDEN_DIR)
      .filter((name) => name.toLowerCase().endsWith('.xlsx'))
      .filter((name) => !name.startsWith('~') && name !== '.DS_Store')

    if (!UPDATE_GOLDEN && expectedFileNames.length === 0) {
      throw new Error(
        [
          '발주서 Golden 파일이 없어요.',
          `- 기대 폴더: ${ORDER_GOLDEN_DIR}`,
          '- 생성하려면: E2E_UPDATE_GOLDEN=true pnpm test:e2e:update-golden',
        ].join('\n'),
      )
    }

    if (!UPDATE_GOLDEN) {
      expect(
        expectedFileNames.length,
        `Golden 발주서 파일 개수가 예상과 달라요 (expected: ${EXPECTED_GOLDEN_COUNT})`,
      ).toBe(EXPECTED_GOLDEN_COUNT)
    }

    const expectedManufacturerKeys = new Set(
      expectedFileNames.map((name) => name.replace(/_발주서\.xlsx$/i, '').trim()),
    )
    const coveredManufacturerKeys = new Set<string>()

    for (let i = 0; i < totalRows; i++) {
      const row = batchRows.nth(i)

      const manufacturerName = (await row.locator('span.text-sm.font-medium').first().innerText()).trim()
      const totalOrdersText = (await row.locator('td').nth(2).innerText()).trim()
      const totalOrders = parseCount(totalOrdersText)

      if (!manufacturerName || totalOrders <= 0) {
        continue
      }

      const manufacturerKey = sanitizeFileName(manufacturerName)
      coveredManufacturerKeys.add(manufacturerKey)

      const fileBaseName = `${sanitizeFileName(manufacturerName)}_발주서.xlsx`
      const actualPath = path.join(DOWNLOADS_DIR, fileBaseName)
      const expectedPath = path.join(ORDER_GOLDEN_DIR, fileBaseName)

      // 메뉴 열기 → 다운로드
      await row.locator('button[title="작업 메뉴"]').click()

      const captured = await captureNextOrdersDownload(page, async () => {
        await page.getByRole('menuitem', { name: '다운로드', exact: true }).click()
      })

      if (!captured.ok) {
        throw new Error(`[${manufacturerName}] 다운로드 실패 (${captured.status}): ${captured.errorMessage}`)
      }

      fs.writeFileSync(actualPath, captured.body)
      expect(fs.statSync(actualPath).size).toBeGreaterThan(0)

      if (UPDATE_GOLDEN) {
        fs.copyFileSync(actualPath, expectedPath)
        continue
      }

      if (!fs.existsSync(expectedPath)) {
        throw new Error(`기대 파일이 없어요: ${expectedPath}`)
      }

      const compareResult = await flexibleCompareExcelFiles(
        expectedPath,
        actualPath,
        FLEXIBLE_COMPARE_OPTIONS_ORDER_BASE,
      )

      if (!compareResult.isMatch) {
        console.log(`\n[${manufacturerName}] Golden 불일치`)
        console.log(formatFlexibleCompareResult(compareResult))
      }

      expect(
        compareResult.isMatch,
        `[${manufacturerName}] Golden 불일치: ${compareResult.summary} (expected: ${expectedPath})`,
      ).toBe(true)
    }

    if (!UPDATE_GOLDEN) {
      const missing = [...expectedManufacturerKeys].filter((k) => !coveredManufacturerKeys.has(k))
      if (missing.length > 0) {
        throw new Error(`발주 생성 > 발송 대상에 없는 Golden 제조사가 있어요: ${missing.join(', ')}`)
      }
    }
  })

  test('선택 다운로드 버튼으로 받은 발주서를 Golden과 비교해요', async ({ page }) => {
    test.setTimeout(2 * 60_000)

    await uploadSabangnet(page)

    await page.goto('/order/sendable')
    await expect(page.locator('table')).toBeVisible({ timeout: 30_000 })

    const firstRow = page
      .locator('tbody tr')
      .filter({ has: page.locator('button[title="작업 메뉴"]') })
      .first()
    await expect(firstRow).toBeVisible()

    const manufacturerName = (await firstRow.locator('span.text-sm.font-medium').first().innerText()).trim()
    expect(manufacturerName).toBeTruthy()

    const fileBaseName = `${sanitizeFileName(manufacturerName)}_발주서.xlsx`
    const actualPath = path.join(DOWNLOADS_DIR, `선택다운로드_${fileBaseName}`)
    const expectedPath = path.join(ORDER_GOLDEN_DIR, fileBaseName)

    // 첫 행 선택 → 선택 다운로드 클릭
    await firstRow.getByRole('checkbox').click()
    const bulkDownloadButton = page.getByRole('button', { name: '선택 다운로드', exact: true })
    await expect(bulkDownloadButton).toBeEnabled()

    const captured = await captureNextOrdersDownload(page, async () => {
      await bulkDownloadButton.click()
    })

    if (!captured.ok) {
      throw new Error(`[${manufacturerName}] 선택 다운로드 실패 (${captured.status}): ${captured.errorMessage}`)
    }

    fs.writeFileSync(actualPath, captured.body)
    expect(fs.statSync(actualPath).size).toBeGreaterThan(0)

    if (UPDATE_GOLDEN) {
      fs.copyFileSync(actualPath, expectedPath)
      return
    }

    if (!fs.existsSync(expectedPath)) {
      throw new Error(`기대 파일이 없어요: ${expectedPath}`)
    }

    const compareResult = await flexibleCompareExcelFiles(expectedPath, actualPath, FLEXIBLE_COMPARE_OPTIONS_ORDER_BASE)

    if (!compareResult.isMatch) {
      console.log(`\n[${manufacturerName}] 선택 다운로드 Golden 불일치`)
      console.log(formatFlexibleCompareResult(compareResult))
    }

    expect(
      compareResult.isMatch,
      `[${manufacturerName}] 선택 다운로드 Golden 불일치: ${compareResult.summary} (expected: ${expectedPath})`,
    ).toBe(true)
  })
})

interface CapturedDownload {
  body: Buffer
  errorMessage: string
  ok: boolean
  status: number
}

async function captureNextOrdersDownload(page: Page, trigger: () => Promise<void>): Promise<CapturedDownload> {
  let resolveCaptured: ((value: CapturedDownload) => void) | null = null
  let rejectCaptured: ((reason: unknown) => void) | null = null

  const capturedPromise = new Promise<CapturedDownload>((resolve, reject) => {
    resolveCaptured = resolve
    rejectCaptured = reject
  })

  const handler = async (route: Route) => {
    try {
      const response = await route.fetch()
      const body = await response.body()

      const ok = response.ok()
      const status = response.status()
      const contentType = response.headers()['content-type'] ?? ''
      const errorMessage = (() => {
        if (ok) return ''
        if (contentType.includes('application/json')) {
          try {
            const parsed = JSON.parse(body.toString('utf-8')) as { error?: unknown }
            return typeof parsed.error === 'string' ? parsed.error : body.toString('utf-8')
          } catch {
            return body.toString('utf-8')
          }
        }
        return body.toString('utf-8')
      })()

      resolveCaptured?.({ ok, status, body, errorMessage })
      await route.fulfill({ response, body })
    } catch (error) {
      rejectCaptured?.(error)
      throw error
    }
  }

  await page.route('**/api/orders/download**', handler)

  try {
    await trigger()
    return await Promise.race([
      capturedPromise,
      new Promise<CapturedDownload>((_, reject) =>
        setTimeout(() => reject(new Error('다운로드 응답을 캡처하지 못했어요')), 60_000),
      ),
    ])
  } finally {
    await page.unroute('**/api/orders/download**', handler)
  }
}

async function loadAllOrderBatches(page: Page): Promise<void> {
  const sentinel = page.locator('[data-slot="infinite-scroll-sentinel"]')

  // 최대 10번까지 다음 페이지 로드를 시도해요. (40개 내외면 기본 limit=20 기준 3~4번이면 충분해요)
  for (let i = 0; i < 10; i++) {
    const nextPageResponsePromise = page
      .waitForResponse(
        (res) =>
          res.url().includes('/api/orders?') && res.url().includes('cursor=') && res.request().method() === 'GET',
        { timeout: 3_000 },
      )
      .catch(() => null)

    await sentinel.scrollIntoViewIfNeeded()
    const res = await nextPageResponsePromise

    if (!res) {
      break
    }

    await page.waitForTimeout(200)
  }
}

function parseCount(text: string): number {
  const match = text.replaceAll(',', '').match(/(\d+)/)
  return match ? Number(match[1]) : 0
}

function sanitizeFileName(input: string): string {
  return input.replaceAll('/', '_').replaceAll('\n', ' ').replaceAll('\r', ' ').trim()
}

async function uploadSabangnet(page: Page): Promise<void> {
  await page.goto('/upload/sabangnet')
  await expect(page.getByRole('heading', { name: '주문 업로드' })).toBeVisible()

  const uploadResponsePromise = page.waitForResponse((res) => {
    return res.url().includes('/api/upload/sabangnet') && res.request().method() === 'POST'
  })

  await page.locator('input[type="file"]').setInputFiles(INPUT_FILES.sabangnetAllManufacturers)

  const uploadResponse = await uploadResponsePromise
  expect(uploadResponse.ok()).toBe(true)

  await expect(page.getByText('업로드 결과')).toBeVisible({ timeout: 60_000 })
}

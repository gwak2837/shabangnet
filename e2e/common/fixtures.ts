import fs from 'fs'
import path from 'path'

/**
 * E2E 데이터 폴더 규약
 * - public/data/1. input/**: 테스트에서 업로드할 원본 파일
 * - public/data/2. output/**: Golden(expected) 파일
 */
export const DATA_DIR = path.join(__dirname, '../../public/data')
export const INPUT_DIR = path.join(DATA_DIR, '1. input')
export const OUTPUT_DIR = path.join(DATA_DIR, '2. output')

const SABANGNET_INPUT_DIR = path.join(INPUT_DIR, '1. sabangnet')
const SHOPPING_MALL_INPUT_DIR = path.join(INPUT_DIR, '2. shopping-mall')
const SHOPPING_MALL_OUTPUT_DIR = path.join(OUTPUT_DIR, '1. shopping-mall')

export const ORDER_GOLDEN_DIR = path.join(OUTPUT_DIR, '3. order')

function listXlsxFileNames(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((name) => name.toLowerCase().endsWith('.xlsx'))
    .filter((name) => !name.startsWith('~') && name !== '.DS_Store')
}

function resolveFileNameByNfc(dir: string, desiredFileName: string): string {
  const target = desiredFileName.normalize('NFC')
  const found = fs.readdirSync(dir).find((name) => name.normalize('NFC') === target)
  if (!found) {
    throw new Error(`E2E fixture 파일을 찾을 수 없어요: ${path.join(dir, desiredFileName)}`)
  }
  return path.join(dir, found)
}

export const INPUT_FILES = {
  // ✅ 기본: 현행 사방넷 업로드 양식(306행)
  sabangnet: resolveFileNameByNfc(SABANGNET_INPUT_DIR, '20251210_주문서확인처리_다온발주서.xlsx'),
  // ✅ CI 전수 제조사 발주서 Golden용(42개): sabangnet + 추가 제조사 샘플 행 포함
  sabangnetAllManufacturers: resolveFileNameByNfc(
    SABANGNET_INPUT_DIR,
    '20251210_주문서확인처리_다온발주서_제조사전수42.xlsx',
  ),
} as const

export const TEST_USER = {
  email: 'test@e2e.local',
  password: 'Test1234!',
} as const

export interface ShoppingMallGoldenCase {
  /** UI 선택에 사용할 쇼핑몰 표시명 */
  dropdownOption: 'SK스토아' | '삼성복지몰' | '삼성카드몰' | '웰프라자'
  /** expected(output) 파일 절대 경로 */
  expectedFile: string
  /** 파일명 (input/output 동일) */
  fileName: string
  /** 유연 비교 시 헤더 행 (prefix row 제외) */
  headerRow: number
  /** input 파일 절대 경로 */
  inputFile: string
}

/**
 * public/data/2. output/1. shopping-mall 기준으로
 * Golden 비교 케이스를 자동 구성해요.
 */
export function getShoppingMallGoldenCases(): ShoppingMallGoldenCase[] {
  const outputFileNames = listXlsxFileNames(SHOPPING_MALL_OUTPUT_DIR)

  return outputFileNames.map((fileName) => {
    const expectedFile = resolveFileNameByNfc(SHOPPING_MALL_OUTPUT_DIR, fileName)
    const inputFile = resolveFileNameByNfc(SHOPPING_MALL_INPUT_DIR, fileName)

    return {
      fileName,
      inputFile,
      expectedFile,
      dropdownOption: inferShoppingMallDropdownOption(fileName),
      headerRow: inferShoppingMallHeaderRow(fileName),
    }
  })
}

function inferShoppingMallDropdownOption(fileName: string): ShoppingMallGoldenCase['dropdownOption'] {
  const normalized = fileName.normalize('NFC')

  if (normalized.includes('sk스토아')) return 'SK스토아'
  if (normalized.includes('삼성복지몰')) return '삼성복지몰'
  if (normalized.includes('삼성카드몰')) return '삼성카드몰'
  if (normalized.includes('웰프라자')) return '웰프라자'

  throw new Error(`쇼핑몰 파일명을 해석할 수 없어요: ${fileName}`)
}

function inferShoppingMallHeaderRow(fileName: string): number {
  // SK스토아는 1~2행이 prefix(meta)이고 3행이 헤더예요.
  return fileName.normalize('NFC').includes('sk스토아') ? 3 : 1
}

export const FLEXIBLE_COMPARE_OPTIONS_SHOPPING_MALL_BASE = {
  dateOnly: true,
  ignoreEmptyCells: true,
  ignoreRowOrder: false,
  normalizeAddresses: true,
  normalizePhoneNumbers: true,
  numericTolerance: 0.01,
  trimWhitespace: true,
} as const

export const FLEXIBLE_COMPARE_OPTIONS_ORDER_BASE = {
  dateOnly: true,
  ignoreEmptyCells: true,
  ignoreRowOrder: true,
  keyColumn: '주문번호',
  normalizeAddresses: true,
  normalizePhoneNumbers: true,
  numericTolerance: 0.01,
  trimWhitespace: true,
  headerRow: 1,
} as const

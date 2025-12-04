/**
 * 실제 데이터 분석 스크립트
 *
 * real-data 폴더의 엑셀 파일들을 분석하여 마스터 데이터를 추출합니다.
 *
 * 실행 방법:
 * pnpm tsx tools/analyze-real-data.ts
 */

import ExcelJS from 'exceljs'
import fs from 'fs'
import path from 'path'

// 분석 결과 타입
interface ManufacturerInfo {
  name: string
  orderCount: number
  productCodes: Set<string>
}

interface ProductMapping {
  manufacturer: string
  optionName: string
  productCode: string
  productName: string
}

interface ShoppingMallAnalysis {
  dataStartRow: number
  fileName: string
  headerRow: number
  headers: string[]
  sampleData: string[][]
}

// 사방넷 원본 파일 분석
async function analyzeSabangnetFile(filePath: string): Promise<{
  manufacturers: Map<string, ManufacturerInfo>
  productMappings: ProductMapping[]
}> {
  console.log(`\n📊 사방넷 원본 파일 분석: ${path.basename(filePath)}`)

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    throw new Error('워크시트를 찾을 수 없습니다')
  }

  const manufacturers = new Map<string, ManufacturerInfo>()
  const productMappings: ProductMapping[] = []
  const seenMappings = new Set<string>()

  let rowCount = 0
  worksheet.eachRow((row, rowNumber) => {
    // 첫 번째 행은 헤더
    if (rowNumber === 1) {
      console.log('   헤더 행 확인됨')
      return
    }

    rowCount++

    // 컬럼 인덱스 (0-based in constants, but ExcelJS is 1-based)
    // index 12 = M열 = 제조사
    // index 25 = Z열 = 품번코드
    // index 0 = A열 = 상품명
    // index 18 = S열 = 옵션

    const manufacturer = getCellValue(row.getCell(13)).trim() // 제조사 (M열, index 12 -> cell 13)
    const productCode = getCellValue(row.getCell(26)).trim() // 품번코드 (Z열, index 25 -> cell 26)
    const productName = getCellValue(row.getCell(1)).trim() // 상품명 (A열)
    const optionName = getCellValue(row.getCell(19)).trim() // 옵션 (S열, index 18 -> cell 19)

    if (!manufacturer) {
      return
    }

    // 제조사 정보 업데이트
    if (!manufacturers.has(manufacturer)) {
      manufacturers.set(manufacturer, {
        name: manufacturer,
        orderCount: 0,
        productCodes: new Set(),
      })
    }

    const mfrInfo = manufacturers.get(manufacturer)!
    mfrInfo.orderCount++
    if (productCode) {
      mfrInfo.productCodes.add(productCode)
    }

    // 상품-제조사 매핑 (중복 제거)
    if (productCode || productName) {
      const mappingKey = `${productCode}|${productName}|${optionName}|${manufacturer}`
      if (!seenMappings.has(mappingKey)) {
        seenMappings.add(mappingKey)
        productMappings.push({
          productCode,
          productName,
          optionName,
          manufacturer,
        })
      }
    }
  })

  console.log(`   총 ${rowCount}개 데이터 행 처리`)
  console.log(`   ${manufacturers.size}개 제조사 발견`)
  console.log(`   ${productMappings.length}개 상품-제조사 매핑 추출`)

  return { manufacturers, productMappings }
}

// 쇼핑몰 파일 분석
async function analyzeShoppingMallFile(filePath: string): Promise<ShoppingMallAnalysis> {
  const fileName = path.basename(filePath)
  console.log(`\n🛒 쇼핑몰 파일 분석: ${fileName}`)

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    throw new Error('워크시트를 찾을 수 없습니다')
  }

  // 헤더 행 찾기 - 유니크한 값이 3개 이상인 행을 찾음
  let headerRow = 1
  let headers: string[] = []

  worksheet.eachRow((row, rowNumber) => {
    if (headers.length > 0) return

    const rowValues: string[] = []
    const uniqueValues = new Set<string>()

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const value = getCellValue(cell)
      rowValues[colNumber - 1] = value
      if (value && value.trim()) {
        uniqueValues.add(value.trim())
      }
    })

    // 유니크한 값이 3개 이상인 행을 헤더로 간주 (제목 행은 같은 값이 반복됨)
    if (uniqueValues.size >= 3) {
      headers = rowValues.filter((v) => v !== undefined)
      headerRow = rowNumber
    }
  })

  // 샘플 데이터 추출 (헤더 다음 3행)
  const sampleData: string[][] = []
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow || sampleData.length >= 3) return

    const rowData: string[] = []
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      rowData[colNumber - 1] = getCellValue(cell)
    })

    if (rowData.some((v) => v && v.trim())) {
      sampleData.push(rowData)
    }
  })

  console.log(`   헤더 행: ${headerRow}`)
  console.log(`   컬럼 수: ${headers.length}`)
  console.log(`   헤더: ${headers.slice(0, 10).join(', ')}${headers.length > 10 ? '...' : ''}`)

  return {
    fileName,
    headers,
    headerRow,
    dataStartRow: headerRow + 1,
    sampleData,
  }
}

// 셀 값 추출 헬퍼
function getCellValue(cell: ExcelJS.Cell): string {
  const value = cell.value

  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'object') {
    if ('richText' in value) {
      return value.richText.map((rt) => rt.text).join('')
    }
    if ('hyperlink' in value && 'text' in value) {
      return String(value.text)
    }
    if ('formula' in value && 'result' in value) {
      return String(value.result ?? '')
    }
    if (value instanceof Date) {
      return value.toISOString().split('T')[0]
    }
    return String(value)
  }

  return String(value)
}

// 메인 함수
async function main() {
  console.log('🔍 실제 데이터 분석 시작...\n')

  const realDataDir = path.join(__dirname, '../public/data/real-data')

  if (!fs.existsSync(realDataDir)) {
    console.error('❌ real-data 폴더를 찾을 수 없습니다:', realDataDir)
    process.exit(1)
  }

  // 1. 사방넷 원본 파일 분석
  const sabangnetFile = path.join(realDataDir, '사방넷 원본파일 수정본.xlsx')
  if (!fs.existsSync(sabangnetFile)) {
    console.error('❌ 사방넷 원본 파일을 찾을 수 없습니다:', sabangnetFile)
    process.exit(1)
  }

  const { manufacturers, productMappings } = await analyzeSabangnetFile(sabangnetFile)

  // 2. 쇼핑몰 원본 파일 분석
  const shoppingMallFiles = ['sk원본1203.xlsx', '삼성복지원본 1203.xlsx', '삼성카드 원본 1203.xlsx']

  const shoppingMallAnalyses: ShoppingMallAnalysis[] = []
  for (const fileName of shoppingMallFiles) {
    const filePath = path.join(realDataDir, fileName)
    if (fs.existsSync(filePath)) {
      const analysis = await analyzeShoppingMallFile(filePath)
      shoppingMallAnalyses.push(analysis)
    } else {
      console.log(`⚠️  파일 없음: ${fileName}`)
    }
  }

  // 3. 결과 저장
  saveResults(manufacturers, productMappings, shoppingMallAnalyses)

  // 4. 요약 출력
  console.log('\n' + '='.repeat(60))
  console.log('📋 분석 요약')
  console.log('='.repeat(60))

  console.log('\n📦 제조사 목록 (주문 건수 기준 상위 10개):')
  const sortedMfrs = Array.from(manufacturers.values()).sort((a, b) => b.orderCount - a.orderCount)
  sortedMfrs.slice(0, 10).forEach((m, i) => {
    console.log(`   ${i + 1}. ${m.name}: ${m.orderCount}건 (상품코드 ${m.productCodes.size}개)`)
  })

  if (sortedMfrs.length > 10) {
    console.log(`   ... 외 ${sortedMfrs.length - 10}개 제조사`)
  }

  console.log('\n🛒 쇼핑몰 파일 분석 결과:')
  shoppingMallAnalyses.forEach((a) => {
    console.log(`   ${a.fileName}:`)
    console.log(`      헤더 행: ${a.headerRow}, 데이터 시작: ${a.dataStartRow}`)
    console.log(`      주요 컬럼: ${a.headers.slice(0, 5).join(', ')}...`)
  })

  console.log('\n🎉 분석 완료!')
}

// 결과를 JSON 파일로 저장
function saveResults(
  manufacturers: Map<string, ManufacturerInfo>,
  productMappings: ProductMapping[],
  shoppingMallAnalyses: ShoppingMallAnalysis[],
) {
  const outputDir = path.join(__dirname, '../public/data/extracted')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // 제조사 목록 저장
  const manufacturerList = Array.from(manufacturers.values())
    .map((m) => ({
      name: m.name,
      orderCount: m.orderCount,
      productCodeCount: m.productCodes.size,
    }))
    .sort((a, b) => b.orderCount - a.orderCount)

  fs.writeFileSync(path.join(outputDir, 'manufacturers.json'), JSON.stringify(manufacturerList, null, 2), 'utf-8')
  console.log(`\n✅ 제조사 목록 저장: ${outputDir}/manufacturers.json`)

  // 상품-제조사 매핑 저장
  fs.writeFileSync(path.join(outputDir, 'product-mappings.json'), JSON.stringify(productMappings, null, 2), 'utf-8')
  console.log(`✅ 상품-제조사 매핑 저장: ${outputDir}/product-mappings.json`)

  // 쇼핑몰 분석 결과 저장
  const mallAnalysis = shoppingMallAnalyses.map((a) => ({
    fileName: a.fileName,
    headers: a.headers,
    headerRow: a.headerRow,
    dataStartRow: a.dataStartRow,
  }))

  fs.writeFileSync(path.join(outputDir, 'shopping-mall-analysis.json'), JSON.stringify(mallAnalysis, null, 2), 'utf-8')
  console.log(`✅ 쇼핑몰 분석 결과 저장: ${outputDir}/shopping-mall-analysis.json`)
}

main().catch((error) => {
  console.error('❌ 오류 발생:', error)
  process.exit(1)
})

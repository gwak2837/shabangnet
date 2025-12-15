import './server-only'

import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import ExcelJS from 'exceljs'
import fs from 'fs'
import path from 'path'
import postgres from 'postgres'

import { manufacturer, orderTemplate } from '../src/db/schema/manufacturers'

// 템플릿 파일 분석
async function analyzeTemplateFile(filePath: string): Promise<{
  columnMappings: Record<string, string>
  dataStartRow: number
  headerRow: number
  headers: string[]
}> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    return { headers: [], headerRow: 1, dataStartRow: 2, columnMappings: {} }
  }

  // 헤더 행 찾기 (데이터가 있는 첫 번째 행)
  let headerRow = 1
  const headers: string[] = []

  worksheet.eachRow((row, rowNumber) => {
    if (headers.length === 0) {
      const rowValues: string[] = []
      let hasContent = false

      row.eachCell((cell, colNumber) => {
        const value = getCellValue(cell)
        rowValues[colNumber - 1] = value
        if (value && value.trim()) hasContent = true
      })

      if (hasContent && rowValues.filter((v) => v && v.trim()).length >= 3) {
        headers.push(...rowValues)
        headerRow = rowNumber
      }
    }
  })

  return {
    headers,
    headerRow,
    dataStartRow: headerRow + 1,
    columnMappings: {},
  }
}

// 파일명에서 제조사명 추출
function extractManufacturerName(fileName: string): string {
  // 파일명 패턴: "XXX양식.xlsx" 또는 "XXX 양식.xlsx" 또는 "XXX발주서.xlsx"
  let name = fileName
    .replace(/\.xlsx?$/i, '') // 확장자 제거
    .replace(/양식$/, '') // "양식" 제거
    .replace(/발주서$/, '') // "발주서" 제거
    .replace(/_양식$/, '') // "_양식" 제거
    .replace(/ 양식$/, '') // " 양식" 제거
    .replace(/ 발주서$/, '') // " 발주서" 제거
    .replace(/^다온/, '') // 앞의 "다온" 제거
    .replace(/_다온.*$/, '') // "_다온..." 제거
    .trim()

  // 특수 문자 제거
  name = name.replace(/[★]/g, '').trim()

  return name
}

// 제조사 이름으로 ID 찾기
async function findManufacturerId(db: ReturnType<typeof drizzle>, name: string): Promise<number | null> {
  const result = await db.select().from(manufacturer).where(eq(manufacturer.name, name)).limit(1)

  return result.length > 0 ? result[0].id : null
}

// 셀 값 추출
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

// 인덱스를 엑셀 컬럼 문자로 변환
function indexToColumnLetter(index: number): string {
  let letter = ''
  let i = index
  while (i >= 0) {
    letter = String.fromCharCode((i % 26) + 65) + letter
    i = Math.floor(i / 26) - 1
  }
  return letter
}

async function seed() {
  const databaseURL = process.env.SUPABASE_POSTGRES_URL_NON_POOLING
  if (!databaseURL) {
    console.error('❌ SUPABASE_POSTGRES_URL_NON_POOLING environment variable is not set')
    process.exit(1)
  }

  const templatesDir = path.join(__dirname, '../public/data/templates')

  if (!fs.existsSync(templatesDir)) {
    console.error('❌ Templates directory not found:', templatesDir)
    process.exit(1)
  }

  console.log('🌱 Seeding order templates...')
  console.log('📁 Templates directory:', templatesDir)

  const client = postgres(databaseURL, {
    prepare: false,
    max: 1,
    ssl: process.env.SUPABASE_CERTIFICATE
      ? { ca: process.env.SUPABASE_CERTIFICATE, rejectUnauthorized: true }
      : 'prefer',
  })

  const db = drizzle(client)

  try {
    // 템플릿 파일 목록
    const files = fs.readdirSync(templatesDir).filter((f) => f.endsWith('.xlsx') && !f.startsWith('~'))

    console.log(`📄 Found ${files.length} template files`)

    const results: {
      fileName: string
      manufacturerName: string
      mappingsCount: number
      status: 'created' | 'error' | 'exists' | 'no_manufacturer'
    }[] = []

    for (const fileName of files) {
      const filePath = path.join(templatesDir, fileName)
      const manufacturerName = extractManufacturerName(fileName)

      if (!manufacturerName || manufacturerName === '원본' || manufacturerName.includes('코드')) {
        console.log(`⏭️  Skipping ${fileName} (not a manufacturer template)`)
        results.push({ fileName, manufacturerName, mappingsCount: 0, status: 'no_manufacturer' })
        continue
      }

      try {
        // 제조사 찾기
        const manufacturerId = await findManufacturerId(db, manufacturerName)

        if (!manufacturerId) {
          console.log(`⏭️  Skipping ${fileName} (manufacturer "${manufacturerName}" not found)`)
          results.push({ fileName, manufacturerName, mappingsCount: 0, status: 'no_manufacturer' })
          continue
        }

        // 이미 존재하는지 확인
        const existing = await db
          .select()
          .from(orderTemplate)
          .where(eq(orderTemplate.manufacturerId, manufacturerId))
          .limit(1)

        if (existing.length > 0) {
          console.log(`⏭️  Skipping ${fileName} (template already exists)`)
          results.push({
            fileName,
            manufacturerName,
            mappingsCount: Object.keys(
              typeof existing[0].columnMappings === 'string'
                ? JSON.parse(existing[0].columnMappings)
                : existing[0].columnMappings || {},
            ).length,
            status: 'exists',
          })
          continue
        }

        // 파일 분석
        const analysis = await analyzeTemplateFile(filePath)

        // 템플릿 저장
        await db.insert(orderTemplate).values({
          manufacturerId,
          templateFileName: fileName,
          headerRow: analysis.headerRow,
          dataStartRow: analysis.dataStartRow,
          columnMappings: JSON.stringify(analysis.columnMappings),
        })

        console.log(
          `✅ Added template for ${manufacturerName} (${Object.keys(analysis.columnMappings).length} mappings)`,
        )
        results.push({
          fileName,
          manufacturerName,
          mappingsCount: Object.keys(analysis.columnMappings).length,
          status: 'created',
        })
      } catch (error) {
        console.error(`❌ Error processing ${fileName}:`, error)
        results.push({ fileName, manufacturerName, mappingsCount: 0, status: 'error' })
      }
    }

    // 결과 요약
    console.log('\n📊 Summary:')
    console.log(`   Created: ${results.filter((r) => r.status === 'created').length}`)
    console.log(`   Already exists: ${results.filter((r) => r.status === 'exists').length}`)
    console.log(`   No manufacturer: ${results.filter((r) => r.status === 'no_manufacturer').length}`)
    console.log(`   Errors: ${results.filter((r) => r.status === 'error').length}`)

    console.log('\n🎉 Seeding completed!')
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

seed()

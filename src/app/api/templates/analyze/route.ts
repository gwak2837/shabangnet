import { NextResponse } from 'next/server'

import { analyzeTemplateStructure, type TemplateAnalysis } from '@/lib/excel'

interface AnalyzeResponse {
  analysis?: TemplateAnalysis
  error?: string
  success: boolean
}

// 템플릿 파일 구조 분석
export async function POST(request: Request): Promise<NextResponse<AnalyzeResponse>> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ success: false, error: '파일이 없습니다' }, { status: 400 })
    }

    // 파일 유효성 검사
    const validExtensions = ['.xlsx', '.xls']
    const fileName = file.name
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()

    if (!validExtensions.includes(ext)) {
      return NextResponse.json({ success: false, error: '엑셀 파일(.xlsx, .xls)만 업로드 가능합니다' }, { status: 400 })
    }

    // 파일 읽기
    const buffer = await file.arrayBuffer()

    // 템플릿 분석
    const analysis = await analyzeTemplateStructure(buffer)

    return NextResponse.json({
      success: true,
      analysis,
    })
  } catch (error) {
    console.error('Template analysis error:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}

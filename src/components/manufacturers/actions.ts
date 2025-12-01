'use server'

import { analyzeTemplateStructure, type TemplateAnalysis } from '@/lib/excel'

// ============================================================================
// Types
// ============================================================================

interface ActionResult {
  error?: string
  success: boolean
}

interface AnalyzeTemplateResult extends ActionResult {
  analysis?: TemplateAnalysis
}

// ============================================================================
// Template Actions
// ============================================================================

/**
 * 발주서 템플릿 파일 구조를 분석합니다.
 */
export async function analyzeOrderTemplate(fileBuffer: ArrayBuffer): Promise<AnalyzeTemplateResult> {
  try {
    const analysis = await analyzeTemplateStructure(fileBuffer)

    return {
      success: true,
      analysis,
    }
  } catch (error) {
    console.error('Template analysis error:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'
    return { success: false, error: errorMessage }
  }
}

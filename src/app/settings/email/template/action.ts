'use server'

import { headers } from 'next/headers'

import type { EmailTemplate } from '@/lib/email/templates'

import {
  getSampleOrderEmailTemplateVariables,
  ORDER_EMAIL_TEMPLATE_SLUG,
  ORDER_EMAIL_TEMPLATE_VARIABLES,
} from '@/common/constants/order-email-template'
import { auth } from '@/lib/auth'
import { createEmailTemplate, getEmailTemplateBySlug, renderTemplate, updateEmailTemplate } from '@/lib/email/templates'

// ============================================================================
// Types
// ============================================================================

export interface EmailTemplateDisplay {
  body: string
  createdAt: string
  id: number
  slug: string
  subject: string
  updatedAt: string
  variables: Record<string, string> | null
}

interface ActionResult {
  error?: string
  message?: string
  success: boolean
}

interface GetTemplateResult {
  error?: string
  success: boolean
  template: EmailTemplateDisplay | null
}

interface PreviewResult {
  body: string
  error?: string
  subject: string
  success: boolean
}

// ============================================================================
// Template Actions
// ============================================================================

/**
 * 이메일 템플릿을 생성합니다. (전역 1개만 허용)
 */
export async function createOrderEmailTemplateAction({
  data,
}: {
  data: { body: string; subject: string }
}): Promise<ActionResult> {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return { success: false, error: '권한이 없어요.' }
  }

  try {
    const existing = await getEmailTemplateBySlug(ORDER_EMAIL_TEMPLATE_SLUG)
    if (existing) {
      return { success: false, error: '이미 템플릿이 있어요. 수정만 할 수 있어요.' }
    }

    const subject = String(data.subject ?? '').trim()
    const body = String(data.body ?? '').trim()

    validateOrderEmailTemplate({ subject, body })

    await createEmailTemplate({
      slug: ORDER_EMAIL_TEMPLATE_SLUG,
      subject,
      body,
      variables: ORDER_EMAIL_TEMPLATE_VARIABLES,
    })

    return {
      success: true,
      message: '템플릿이 생성됐어요.',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '템플릿 생성에 실패했어요.'
    return { success: false, error: errorMessage }
  }
}

/**
 * 이메일 템플릿을 조회합니다. (없으면 null)
 */
export async function getOrderEmailTemplateAction(): Promise<GetTemplateResult> {
  try {
    const template = await getEmailTemplateBySlug(ORDER_EMAIL_TEMPLATE_SLUG)

    return {
      success: true,
      template: template ? templateToDisplay(template) : null,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '템플릿을 불러오는 중 오류가 발생했어요.'
    return { success: false, template: null, error: errorMessage }
  }
}

/**
 * 템플릿을 미리보기합니다. (저장 전에도 사용)
 */
export async function previewEmailTemplateAction({
  template,
  variables,
}: {
  template: { subject: string; body: string }
  variables: object
}): Promise<PreviewResult> {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return { success: false, subject: '', body: '', error: '권한이 없어요.' }
  }

  try {
    const subject = String(template.subject ?? '').trim()
    const body = String(template.body ?? '').trim()
    validateOrderEmailTemplate({ subject, body, variables })

    const result = renderTemplate({ subject, body }, variables)

    return {
      success: true,
      subject: result.subject,
      body: result.body,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '미리보기에 실패했어요.'
    return { success: false, subject: '', body: '', error: errorMessage }
  }
}

/**
 * 이메일 템플릿을 업데이트합니다. (전역 1개)
 */
export async function updateOrderEmailTemplateAction({
  data,
}: {
  data: { body: string; subject: string }
}): Promise<ActionResult> {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) {
    return { success: false, error: '권한이 없어요.' }
  }

  try {
    const existing = await getEmailTemplateBySlug(ORDER_EMAIL_TEMPLATE_SLUG)
    if (!existing) {
      return { success: false, error: '템플릿이 없어요. 먼저 템플릿을 만들어 주세요.' }
    }

    const subject = String(data.subject ?? '').trim()
    const body = String(data.body ?? '').trim()

    validateOrderEmailTemplate({ subject, body })

    await updateEmailTemplate(existing.id, {
      subject,
      body,
      variables: ORDER_EMAIL_TEMPLATE_VARIABLES,
    })

    return {
      success: true,
      message: '템플릿이 저장됐어요.',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '템플릿 저장에 실패했어요.'
    return { success: false, error: errorMessage }
  }
}

async function checkAdminRole(): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() })
  return Boolean(session?.user?.isAdmin)
}

function templateToDisplay(template: EmailTemplate): EmailTemplateDisplay {
  return {
    id: template.id,
    slug: template.slug,
    subject: template.subject,
    body: template.body,
    variables: template.variables,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  }
}

function validateOrderEmailTemplate({
  subject,
  body,
  variables,
}: {
  body: string
  subject: string
  variables?: object
}) {
  if (subject.trim().length === 0) {
    throw new Error('이메일 제목을 입력해 주세요.')
  }

  if (body.trim().length === 0) {
    throw new Error('이메일 본문을 입력해 주세요.')
  }

  if (/<\s*script\b/i.test(body)) {
    throw new Error('스크립트는 사용할 수 없어요. <script> 태그를 제거해 주세요.')
  }

  if (/<\s*img\b/i.test(body)) {
    throw new Error('이미지는 사용할 수 없어요. <img> 태그를 제거해 주세요.')
  }

  // 저장/미리보기 단계에서 컴파일 + 1회 렌더링으로 문법 오류를 잡아요.
  // (unknown helper/partial 등은 렌더 시점에 터지므로 렌더까지 실행해요.)
  const sample = variables ?? getSampleOrderEmailTemplateVariables()

  try {
    const rendered = renderTemplate({ subject, body }, sample)

    if (rendered.subject.trim().length === 0) {
      throw new Error('렌더링 결과 제목이 비어있어요.')
    }
    if (rendered.body.trim().length === 0) {
      throw new Error('렌더링 결과 본문이 비어있어요.')
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '템플릿 문법 오류가 있어요.'
    throw new Error(`템플릿 문법을 확인해 주세요. (${message})`)
  }
}

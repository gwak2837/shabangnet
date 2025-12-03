'use client'

import { AlertCircle, CheckCircle2, Eye, FileText, Loader2, Save } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import type { EmailTemplateDisplay } from './actions/email-templates'

import {
  ensureDefaultOrderTemplateAction,
  previewEmailTemplateAction,
  updateEmailTemplateAction,
} from './actions/email-templates'

interface FormState {
  body: string
  name: string
  subject: string
}

const SAMPLE_VARIABLES = {
  manufacturerName: '(주)테스트제조사',
  senderName: '(주)다온에프앤씨',
  orderDate: new Date().toLocaleDateString('ko-KR'),
  totalItems: 5,
  note: '빠른 배송 부탁드립니다.',
}

export function EmailTemplateForm() {
  const [template, setTemplate] = useState<EmailTemplateDisplay | null>(null)
  const [formData, setFormData] = useState<FormState>({
    name: '',
    subject: '',
    body: '',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewSubject, setPreviewSubject] = useState<string | null>(null)

  useEffect(() => {
    loadTemplate()
  }, [])

  async function loadTemplate() {
    setIsLoading(true)
    try {
      const result = await ensureDefaultOrderTemplateAction()
      if (result.success && result.template) {
        setTemplate(result.template)
        setFormData({
          name: result.template.name,
          subject: result.template.subject,
          body: result.template.body,
        })
      }
    } catch {
      // 로드 실패 시 기본값 유지
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    if (!template) return

    setIsSaving(true)
    setSaveError(null)

    try {
      const result = await updateEmailTemplateAction(template.id, {
        name: formData.name,
        subject: formData.subject,
        body: formData.body,
      })

      if (result.success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        setSaveError(result.error || '저장에 실패했습니다.')
      }
    } catch {
      setSaveError('서버와 통신 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handlePreview() {
    setIsPreviewing(true)
    try {
      const result = await previewEmailTemplateAction(
        { subject: formData.subject, body: formData.body },
        SAMPLE_VARIABLES,
      )

      if (result.success) {
        setPreviewSubject(result.subject)
        setPreviewHtml(result.body)
      }
    } catch {
      // 미리보기 실패
    } finally {
      setIsPreviewing(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="border-slate-200 bg-card shadow-sm py-6">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          <span className="ml-2 text-slate-500">템플릿을 불러오는 중...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-slate-200 bg-card shadow-sm py-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <FileText className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-lg">발주서 이메일 템플릿</CardTitle>
              <CardDescription>제조사에게 발송되는 발주서 이메일의 양식을 설정합니다</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* Template Name */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="templateName">템플릿 이름</Label>
            <Input
              id="templateName"
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="발주서 기본 템플릿"
              value={formData.name}
            />
          </div>

          {/* Subject */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="templateSubject">이메일 제목</Label>
            <Input
              id="templateSubject"
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="{{manufacturerName}} 발주서 - {{orderDate}}"
              value={formData.subject}
            />
            <p className="text-xs text-slate-500">{'{{변수명}}'} 형식으로 동적 값을 삽입할 수 있습니다</p>
          </div>

          {/* Body */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="templateBody">이메일 본문 (HTML)</Label>
            <textarea
              className="w-full min-h-[300px] p-3 text-sm font-mono border border-slate-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-slate-400"
              id="templateBody"
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder="HTML 템플릿을 입력하세요..."
              value={formData.body}
            />
          </div>

          {/* Available Variables */}
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm font-medium text-slate-700 mb-2">사용 가능한 변수</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(template?.variables || {}).map(([key, description]) => (
                <span
                  className="inline-flex items-center gap-1 text-xs bg-card border border-slate-200 rounded px-2 py-1"
                  key={key}
                >
                  <code className="text-amber-600">{`{{${key}}}`}</code>
                  <span className="text-slate-500">- {description}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Save Error */}
          {saveError && (
            <div className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-rose-700">
              <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <span className="font-medium">저장 실패</span>
                <p className="text-sm mt-1 opacity-90">{saveError}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <Button disabled={isPreviewing || isSaving} onClick={handlePreview} variant="outline">
              {isPreviewing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  미리보기 생성 중...
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  미리보기
                </>
              )}
            </Button>

            <div className="flex items-center gap-3">
              {saved && (
                <span className="flex items-center gap-1 text-sm text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  저장되었습니다
                </span>
              )}
              <Button
                className="bg-slate-900 hover:bg-slate-800"
                disabled={isSaving || isPreviewing}
                onClick={handleSave}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    템플릿 저장
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {previewHtml && (
        <Card className="border-slate-200 bg-card shadow-sm py-6">
          <CardHeader>
            <CardTitle className="text-lg">미리보기</CardTitle>
            {previewSubject && (
              <CardDescription>
                <strong>제목:</strong> {previewSubject}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div
              className="border border-slate-200 rounded-lg p-4 bg-card"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

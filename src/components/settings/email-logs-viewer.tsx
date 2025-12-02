'use client'

import { AlertCircle, CheckCircle2, Clock, Loader2, Mail, RefreshCw, Trash2, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import type { EmailLogDisplayEntry } from './actions/email-logs'

import { cleanupEmailLogsAction, getEmailLogsAction } from './actions/email-logs'

type LogStatus = 'failed' | 'pending' | 'sent'

const statusConfig: Record<LogStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  sent: { icon: CheckCircle2, color: 'text-emerald-600', label: '발송됨' },
  failed: { icon: XCircle, color: 'text-rose-600', label: '실패' },
  pending: { icon: Clock, color: 'text-amber-600', label: '대기중' },
}

export function EmailLogsViewer() {
  const [logs, setLogs] = useState<EmailLogDisplayEntry[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isCleaning, setIsCleaning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null)

  useEffect(() => {
    loadLogs()
  }, [])

  async function loadLogs() {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getEmailLogsAction({ limit: 50 })
      if (result.success) {
        setLogs(result.logs)
        setTotal(result.total)
      } else {
        setError(result.error || '로그를 불러오는 중 오류가 발생했습니다.')
      }
    } catch {
      setError('서버와 통신 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true)
    await loadLogs()
    setIsRefreshing(false)
  }

  async function handleCleanup() {
    setIsCleaning(true)
    setCleanupMessage(null)
    try {
      const result = await cleanupEmailLogsAction(90)
      if (result.success) {
        setCleanupMessage(result.message || '정리 완료')
        await loadLogs()
      } else {
        setError(result.error || '정리 중 오류가 발생했습니다.')
      }
    } catch {
      setError('서버와 통신 중 오류가 발생했습니다.')
    } finally {
      setIsCleaning(false)
      setTimeout(() => setCleanupMessage(null), 3000)
    }
  }

  if (isLoading) {
    return (
      <Card className="border-slate-200 bg-card shadow-sm py-6">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          <span className="ml-2 text-slate-500">로그를 불러오는 중...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200 bg-card shadow-sm py-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <Mail className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <CardTitle className="text-lg">이메일 발송 로그</CardTitle>
              <CardDescription>최근 이메일 발송 기록을 확인합니다 (총 {total}건)</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button disabled={isRefreshing || isCleaning} onClick={handleRefresh} size="sm" variant="outline">
              {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button disabled={isRefreshing || isCleaning} onClick={handleCleanup} size="sm" variant="outline">
              {isCleaning ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1 h-4 w-4" />}
              90일 이전 정리
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-rose-700 mb-4">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {cleanupMessage && (
          <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-emerald-700 mb-4">
            <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
            <span>{cleanupMessage}</span>
          </div>
        )}

        {logs.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Mail className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p>발송된 이메일 기록이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const status = statusConfig[log.status as LogStatus] || statusConfig.pending
              const StatusIcon = status.icon

              return (
                <div
                  className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                  key={log.id}
                >
                  <StatusIcon className={`h-5 w-5 mt-0.5 shrink-0 ${status.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900 truncate">{log.subject}</span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          log.status === 'sent'
                            ? 'bg-emerald-100 text-emerald-700'
                            : log.status === 'failed'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <div className="text-sm text-slate-500">
                      <span>받는 사람: {log.recipient}</span>
                      {log.cc && log.cc.length > 0 && <span className="ml-2">참조: {log.cc.join(', ')}</span>}
                    </div>
                    {log.errorMessage && <div className="mt-1 text-sm text-rose-600">{log.errorMessage}</div>}
                    <div className="mt-1 text-xs text-slate-400">
                      {formatDate(log.sentAt || log.createdAt)}
                      {log.messageId && <span className="ml-2">ID: {log.messageId}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

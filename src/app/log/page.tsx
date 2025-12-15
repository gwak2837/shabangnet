import { AppShell } from '@/components/layout/app-shell'
import { SendLogsView } from '@/components/log/send-logs-view'

export default function LogsPage() {
  return (
    <AppShell description="이메일 발송 이력을 확인해요" title="발송 기록">
      <SendLogsView />
    </AppShell>
  )
}

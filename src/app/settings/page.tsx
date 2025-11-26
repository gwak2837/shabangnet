'use client';

import { AppShell } from '@/components/layout';
import { SMTPForm } from '@/components/settings';

export default function SettingsPage() {
  return (
    <AppShell title="설정" description="시스템 설정을 관리합니다">
      <div className="max-w-3xl">
        <SMTPForm />
      </div>
    </AppShell>
  );
}


'use client';

import { AppShell } from '@/components/layout';
import { DuplicateCheckForm, ExclusionForm, SMTPForm } from '@/components/settings';

export default function SettingsPage() {
  return (
    <AppShell title="설정" description="시스템 설정을 관리합니다">
      <div className="max-w-3xl space-y-6">
        <SMTPForm />
        <DuplicateCheckForm />
        <ExclusionForm />
      </div>
    </AppShell>
  );
}


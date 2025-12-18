'use client'

import type { LucideIcon } from 'lucide-react'

import {
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Filter,
  Search,
  Server,
  Shield,
  ShieldCheck,
  Store,
  Truck,
} from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import { type SettingsAccent, SettingsIconBadge } from '@/components/settings/settings-icon-badge'
import { Input } from '@/components/ui/input'

interface SettingsItem {
  accent: SettingsAccent
  description: string
  href: string
  icon: LucideIcon
  keywords: string[]
  title: string
  trace?: string
}

const settingsItems: SettingsItem[] = [
  {
    title: '쇼핑몰 템플릿',
    description: '쇼핑몰별 엑셀 파일 양식을 관리해요',
    href: '/settings/shopping-mall-template',
    icon: Store,
    accent: 'violet',
    trace: '템플릿',
    keywords: ['쇼핑몰', '템플릿', '엑셀', '양식', '컬럼', '매핑', '사방넷'],
  },
  {
    title: '발주서 템플릿',
    description: '제조사 템플릿이 없을 때 사용해요',
    href: '/settings/common-order-template',
    icon: FileSpreadsheet,
    accent: 'blue',
    trace: '템플릿',
    keywords: ['발주서', '템플릿', '엑셀', '양식', '컬럼'],
  },
  {
    title: '이메일 템플릿',
    description: '제조사 이메일 템플릿을 관리해요',
    href: '/settings/email-template',
    icon: FileText,
    accent: 'violet',
    trace: '템플릿',
    keywords: ['이메일', '메일', '템플릿', '제목', '본문', 'handlebars', '치환'],
  },
  {
    title: 'SMTP',
    description: '이메일 발송 서버를 설정해요',
    href: '/settings/email-smtp',
    icon: Server,
    accent: 'indigo',
    trace: '이메일',
    keywords: ['smtp', '이메일', '메일', '서버', '발송', '계정', '비밀번호', 'tls'],
  },
  {
    title: '발송 제외',
    description: '특정 주문 유형을 이메일 발송에서 자동으로 제외해요',
    href: '/settings/exclusion',
    icon: Filter,
    accent: 'rose',
    trace: '검증',
    keywords: ['제외', '발송', '필터', '패턴', 'f열'],
  },
  {
    title: '중복 발주 방지',
    description: '동일 조건 발송 이력을 체크해요',
    href: '/settings/duplicate-check',
    icon: ShieldCheck,
    accent: 'amber',
    trace: '검증',
    keywords: ['중복', '발주', '방지', '기간', '경고'],
  },
  {
    title: '택배사',
    description: '송장의 택배사명을 자동으로 인식해요',
    href: '/settings/courier',
    icon: Truck,
    accent: 'blue',
    trace: '배송',
    keywords: ['택배사', '배송', '송장', '운송장', '코드', '별칭'],
  },
  {
    title: '계정 보안',
    description: '2단계 인증 등 계정 보안을 관리해요',
    href: '/settings/account',
    icon: Shield,
    accent: 'emerald',
    trace: '보안',
    keywords: ['계정', '보안', 'mfa', 'otp', '2단계', 'passkey'],
  },
]

export default function SettingsPage() {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()

  const visibleItems = useMemo(() => {
    return settingsItems.filter((item) => matchesQuery(item, normalizedQuery))
  }, [normalizedQuery])

  const isSearching = normalizedQuery.length > 0

  return (
    <div className="max-w-3xl space-y-6">
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">검색</h2>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            autoComplete="off"
            className="pl-9"
            id="settings-search"
            name="settings-search"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="설정을 검색해 보세요"
            type="search"
            value={query}
          />
        </div>
      </section>

      {isSearching ? (
        <section className="space-y-2">
          <p className="text-sm text-muted-foreground">검색 결과 {visibleItems.length}개</p>

          {visibleItems.length > 0 ? (
            <ul className="divide-y overflow-hidden rounded-xl border bg-card">
              {visibleItems.map((item) => (
                <SettingsRow item={item} key={item.href} showTrace />
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border bg-card p-10 text-center">
              <p className="text-base font-medium text-foreground">검색 결과가 없어요</p>
              <p className="mt-1 text-sm text-muted-foreground">다른 키워드로 다시 검색해 보세요</p>
            </div>
          )}
        </section>
      ) : (
        <>
          <SettingsSection id="templates" title="템플릿">
            {settingsItems.filter((item) => item.trace === '템플릿')}
          </SettingsSection>

          <SettingsSection id="email" title="이메일">
            {settingsItems.filter((item) => item.trace === '이메일')}
          </SettingsSection>

          <SettingsSection id="validation" title="검증">
            {settingsItems.filter((item) => item.trace === '검증')}
          </SettingsSection>

          <SettingsSection id="shipping" title="배송">
            {settingsItems.filter((item) => item.trace === '배송')}
          </SettingsSection>

          <SettingsSection id="security" title="보안">
            {settingsItems.filter((item) => item.trace === '보안')}
          </SettingsSection>
        </>
      )}
    </div>
  )
}

function matchesQuery(item: SettingsItem, normalizedQuery: string): boolean {
  const haystacks = [item.title, item.description, item.trace ?? '', ...item.keywords]
  return haystacks.some((text) => text.toLowerCase().includes(normalizedQuery))
}

function SettingsRow({ item, showTrace }: { item: SettingsItem; showTrace?: boolean }) {
  return (
    <li className="grid grid-cols-[auto_1fr] items-center gap-3 px-4 py-3">
      <SettingsIconBadge accent={item.accent} className="h-9 w-9 shrink-0" icon={item.icon} />
      <Link
        className="min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        href={item.href}
      >
        <div className="flex min-w-0 items-center justify-between gap-4">
          <div className="min-w-0">
            {showTrace && item.trace ? <p className="truncate text-xs text-muted-foreground">{item.trace}</p> : null}
            <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
            <p className="truncate text-sm text-muted-foreground">{item.description}</p>
          </div>
          <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
      </Link>
    </li>
  )
}

function SettingsSection({ title, id, children }: { children: SettingsItem[]; id: string; title: string }) {
  if (children.length === 0) {
    return null
  }

  return (
    <section className="space-y-2 scroll-mt-24" id={id}>
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      <ul className="divide-y overflow-hidden rounded-xl border bg-card">
        {children.map((item) => (
          <SettingsRow item={item} key={item.href} />
        ))}
      </ul>
    </section>
  )
}

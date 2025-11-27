'use client'

import { Header } from './header'
import { Sidebar } from './sidebar'

interface AppShellProps {
  children: React.ReactNode
  description?: string
  title: string
}

export function AppShell({ children, title, description }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="pl-64">
        <Header description={description} title={title} />
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}

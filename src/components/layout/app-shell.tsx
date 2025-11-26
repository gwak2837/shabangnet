'use client'

import { Sidebar } from './sidebar'
import { Header } from './header'

interface AppShellProps {
  children: React.ReactNode
  title: string
  description?: string
}

export function AppShell({ children, title, description }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="pl-64">
        <Header title={title} description={description} />
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}

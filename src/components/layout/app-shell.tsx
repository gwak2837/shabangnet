'use client'

import { useState } from 'react'

import { Header } from './header'
import { Sidebar } from './sidebar'

interface AppShellProps {
  children: React.ReactNode
  description?: string
  title: string
}

export function AppShell({ children, title, description }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="pl-0 md:pl-64">
        <Header description={description} onMenuToggle={() => setIsSidebarOpen(true)} title={title} />
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}

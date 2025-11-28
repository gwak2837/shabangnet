'use client'

import * as React from 'react'

import { cn } from '@/utils/cn'

interface TabsContextValue {
  onValueChange: (value: string) => void
  value: string
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

interface TabsContentProps {
  children: React.ReactNode
  className?: string
  value: string
}

interface TabsListProps {
  children: React.ReactNode
  className?: string
}

interface TabsProps {
  children: React.ReactNode
  className?: string
  onValueChange: (value: string) => void
  value: string
}

interface TabsTriggerProps {
  children: React.ReactNode
  className?: string
  value: string
}

function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn('', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

function TabsContent({ value, children, className }: TabsContentProps) {
  const { value: selectedValue } = useTabsContext()

  if (selectedValue !== value) {
    return null
  }

  return (
    <div
      className={cn(
        'mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2',
        className,
      )}
    >
      {children}
    </div>
  )
}

function TabsList({ children, className }: TabsListProps) {
  return (
    <div
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-md bg-slate-100 p-1 text-slate-500',
        className,
      )}
    >
      {children}
    </div>
  )
}

function TabsTrigger({ value, children, className }: TabsTriggerProps) {
  const { value: selectedValue, onValueChange } = useTabsContext()
  const isSelected = selectedValue === value

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        isSelected ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
        className,
      )}
      onClick={() => onValueChange(value)}
      type="button"
    >
      {children}
    </button>
  )
}

function useTabsContext() {
  const context = React.useContext(TabsContext)
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider')
  }
  return context
}

export { Tabs, TabsContent, TabsList, TabsTrigger }

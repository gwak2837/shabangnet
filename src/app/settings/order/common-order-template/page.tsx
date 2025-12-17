'use client'

import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import { CommonOrderTemplateForm } from './common-order-template-form'

export default function CommonOrderTemplateSettingsPage() {
  const router = useRouter()
  const [isDirty, setIsDirty] = useState(false)
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false)

  useEffect(() => {
    if (!isDirty) return

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  function handleBack() {
    if (isDirty) {
      setIsLeaveConfirmOpen(true)
      return
    }
    router.push('/settings/order')
  }

  function handleLeave() {
    setIsLeaveConfirmOpen(false)
    router.push('/settings/order')
  }

  return (
    <div className="max-w-3xl space-y-6">
      <button
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        onClick={handleBack}
        type="button"
      >
        <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        주문 처리 설정
      </button>

      <CommonOrderTemplateForm onDirtyChange={setIsDirty} />

      <AlertDialog onOpenChange={setIsLeaveConfirmOpen} open={isLeaveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>저장되지 않은 변경사항이 있어요</AlertDialogTitle>
            <AlertDialogDescription>나가면 변경사항이 사라져요. 그래도 나갈까요?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>계속 편집</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeave}>나가기</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}



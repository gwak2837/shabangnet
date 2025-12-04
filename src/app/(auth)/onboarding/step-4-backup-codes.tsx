'use client'

import { Check, Copy, Download, Loader2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

import type { StepProps } from './common'

interface Props extends StepProps {
  backupCodes: string[]
  onComplete: () => void
}

export function Step4BackupCodes({ backupCodes, error, isPending, onComplete }: Props) {
  const [codesConfirmed, setCodesConfirmed] = useState(false)
  const [codesCopied, setCodesCopied] = useState(false)

  async function handleCopyCodes() {
    const codesText = backupCodes.join('\n')
    await navigator.clipboard.writeText(codesText)
    setCodesCopied(true)
    setTimeout(() => setCodesCopied(false), 2000)
  }

  function handleDownloadCodes() {
    const codesText = backupCodes.join('\n')
    const blob = new Blob([`다온 OMS 복구 코드\n\n${codesText}\n\n이 코드를 안전한 곳에 보관하세요.`], {
      type: 'text/plain',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'daon-recovery-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="text-center">
        <div className="mx-auto inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 mb-4">
          <Check className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="font-medium">2차 인증 설정 완료!</h3>
        <p className="text-sm text-muted-foreground mt-1">
          아래 복구 코드를 안전한 곳에 보관하세요.
          <br />
          인증 수단을 분실했을 때 필요합니다.
        </p>
      </div>
      <div className="glass-button rounded-lg p-4">
        <div className="grid grid-cols-2 gap-2 font-mono text-sm">
          {backupCodes.map((code, index) => (
            <div className="glass-input px-2 py-1.5 rounded text-center" key={index}>
              {code}
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button className="flex-1" onClick={handleCopyCodes} variant="glass-outline">
          {codesCopied ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              복사됨
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              복사
            </>
          )}
        </Button>
        <Button className="flex-1" onClick={handleDownloadCodes} variant="glass-outline">
          <Download className="mr-2 h-4 w-4" />
          다운로드
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={codesConfirmed}
          className="glass-checkbox"
          id="codesConfirmed"
          onCheckedChange={(checked) => setCodesConfirmed(checked === true)}
        />
        <Label className="cursor-pointer font-normal text-sm" htmlFor="codesConfirmed">
          복구 코드를 안전하게 보관했습니다
        </Label>
      </div>
      {error && <div className="text-sm text-destructive text-center">{error}</div>}
      <Button className="w-full" disabled={!codesConfirmed || isPending} onClick={onComplete} variant="glass">
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            완료 처리 중
          </>
        ) : (
          '설정 완료'
        )}
      </Button>
    </div>
  )
}

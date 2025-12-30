'use server'

import { and, eq, inArray } from 'drizzle-orm'
import { headers } from 'next/headers'

import type { OrderEmailTemplateVariables } from '@/common/constants/order-email-template'

import { db } from '@/db/client'
import { manufacturer } from '@/db/schema/manufacturers'
import { order, orderEmailLog, orderEmailLogItem } from '@/db/schema/orders'
import { auth } from '@/lib/auth'
import { getOrderEmailTemplateOrThrow, renderOrderEmailFromTemplate } from '@/lib/email/order-email'
import { getSMTPAccount, sendEmail } from '@/lib/email/send'
import { orderIsIncludedSql } from '@/services/order-exclusion'
import { checkDuplicate, generateOrderExcel } from '@/services/orders'
import { getDuplicateCheckSettings } from '@/services/settings'

export interface SendOrderBatchInput {
  manufacturerId: number
  mode?: SendOrderMode
  orderIds: number[]
  reason?: string
}

export interface SendOrderBatchResult {
  error?: string
  fileName?: string
  logId?: number
  orderCount?: number
  requiresEmailSetup?: boolean
  requiresReason?: boolean
  success: boolean
  totalAmount?: number
}

export type SendOrderMode = 'resend' | 'send'

export async function sendOrderBatch(input: SendOrderBatchInput): Promise<SendOrderBatchResult> {
  try {
    // 현재 로그인 사용자 세션에서 이메일 가져오기
    const session = await auth.api.getSession({ headers: await headers() })
    const userEmail = session?.user?.email

    if (!userEmail) {
      return { success: false, error: '로그인이 필요해요' }
    }

    const smtpAccount = await getSMTPAccount(userEmail)

    if (!smtpAccount) {
      return { success: false, error: 'SMTP 계정이 설정되지 않았어요. 설정 > 이메일에서 설정해 주세요.' }
    }

    if (!input.manufacturerId) {
      return { success: false, error: '제조사를 선택해 주세요.' }
    }

    if (!input.orderIds || input.orderIds.length === 0) {
      return { success: false, error: '발송할 주문이 없어요.' }
    }

    const mode: SendOrderMode = input.mode ?? 'send'
    const reason = input.reason?.trim() ?? ''

    const [mfr] = await db
      .select({
        id: manufacturer.id,
        name: manufacturer.name,
        emails: manufacturer.emails,
      })
      .from(manufacturer)
      .where(eq(manufacturer.id, input.manufacturerId))

    if (!mfr) {
      return { success: false, error: '제조사를 찾을 수 없어요.' }
    }

    const toEmails = normalizeEmails(mfr.emails)

    if (toEmails.length === 0) {
      return {
        success: false,
        requiresEmailSetup: true,
        error: '제조사 이메일이 설정되지 않았어요. 제조사 관리에서 이메일을 먼저 설정해 주세요.',
      }
    }

    const ordersForBatch = await db
      .select()
      .from(order)
      .where(
        and(
          eq(order.manufacturerId, input.manufacturerId),
          inArray(order.id, input.orderIds),
          orderIsIncludedSql(order.fulfillmentType),
        ),
      )

    if (ordersForBatch.length === 0) {
      return { success: false, error: '발송할 주문이 없어요.' }
    }

    const candidateOrders = mode === 'resend' ? ordersForBatch : ordersForBatch.filter((o) => o.status !== 'completed')

    if (candidateOrders.length === 0) {
      return { success: false, error: '이미 발송 완료된 주문만 있어요.' }
    }

    // 재발송은 항상 사유 필요
    if (mode === 'resend' && reason.length === 0) {
      return { success: false, error: '재발송 사유를 입력해 주세요.', requiresReason: true }
    }

    // 중복 발송 체크(제조사 + 주소 동일 시 알람) + 사유 입력 요구
    const duplicateCheckSettings = await getDuplicateCheckSettings()
    const recipientAddresses = candidateOrders
      .map((o) => o.address)
      .filter((addr): addr is string => typeof addr === 'string' && addr.trim().length > 0)
    const uniqueRecipientAddresses = [...new Set(recipientAddresses)]

    if (duplicateCheckSettings.enabled && uniqueRecipientAddresses.length > 0) {
      const duplicateResult = await checkDuplicate(
        input.manufacturerId,
        uniqueRecipientAddresses,
        duplicateCheckSettings.periodDays,
      )

      if (duplicateResult.hasDuplicate && reason.length === 0) {
        return { success: false, error: '중복 발송 사유를 입력해 주세요.', requiresReason: true }
      }
    }

    const orderIdsToSend = candidateOrders.map((o) => o.id)
    // 결제금액은 "수량 포함" 총액이에요.
    const totalAmount = candidateOrders.reduce((sum, o) => sum + (o.paymentAmount ?? 0), 0)
    const orderCount = candidateOrders.length

    let orderEmailTemplate: Awaited<ReturnType<typeof getOrderEmailTemplateOrThrow>>
    try {
      orderEmailTemplate = await getOrderEmailTemplateOrThrow()
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : '이메일 템플릿을 불러오지 못했어요. 설정 > 이메일 템플릿을 확인해 주세요.'
      return { success: false, error: errorMessage }
    }

    const excelResult = await generateOrderExcel({ manufacturerId: input.manufacturerId, orderIds: orderIdsToSend })

    if ('error' in excelResult) {
      return { success: false, error: excelResult.error }
    }

    const now = new Date()

    const fromName = smtpAccount.fromName || '(주)다온에프앤씨'

    const variables: OrderEmailTemplateVariables = {
      manufacturerName: mfr.name,
      senderName: fromName,
      senderEmail: smtpAccount.email,
      toEmail: toEmails.join(', '),
      orderDate: formatDateKorean(now),
      sentAt: now.toISOString(),
      fileName: excelResult.fileName,
      orderCount,
      totalAmount,
      totalAmountFormatted: formatCurrencyWon(totalAmount),
      recipientAddressCount: uniqueRecipientAddresses.length,
      mode,
      reason: reason.length > 0 ? reason : null,
      orders: candidateOrders.map((o) => {
        const paymentAmount = o.paymentAmount ?? 0
        return {
          sabangnetOrderNumber: o.sabangnetOrderNumber,
          mallOrderNumber: o.mallOrderNumber ?? null,
          productName: o.productName ?? '',
          optionName: o.optionName ?? null,
          quantity: o.quantity ?? 0,
          paymentAmount,
          paymentAmountFormatted: formatCurrencyWon(paymentAmount),
          cost: o.cost ?? 0,
          shippingCost: o.shippingCost ?? 0,
          recipientName: o.recipientName ?? '',
          recipientPhone: o.recipientPhone ?? null,
          recipientMobile: o.recipientMobile ?? null,
          postalCode: o.postalCode ?? null,
          address: o.address ?? null,
          memo: o.memo ?? null,
          shoppingMall: o.shoppingMall ?? null,
          courier: o.courier ?? null,
          trackingNumber: o.trackingNumber ?? null,
        }
      }),
    }

    let subject: string
    let html: string
    let text: string

    try {
      ;({ subject, html, text } = renderOrderEmailFromTemplate(orderEmailTemplate, variables))
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '이메일 템플릿 렌더링에 실패했어요. 템플릿을 확인해 주세요.'
      return { success: false, error: errorMessage }
    }

    // 1) DB에 발송 기록(pending) + 항목 저장 + 주문 상태(processing) 반영 (트랜잭션)
    const emailLogId = await db.transaction(async (tx) => {
      const [emailLog] = await tx
        .insert(orderEmailLog)
        .values({
          manufacturerId: mfr.id,
          manufacturerName: mfr.name,
          emails: toEmails,
          subject,
          fileName: excelResult.fileName,
          attachmentFile: excelResult.buffer,
          attachmentFileSize: excelResult.buffer.length,
          orderCount,
          totalAmount,
          status: 'pending',
          errorMessage: null,
          recipientAddresses: uniqueRecipientAddresses,
          duplicateReason: reason.length > 0 ? reason : null,
          sentAt: now,
          sentBy: userEmail,
        })
        .returning({ id: orderEmailLog.id })

      const id = emailLog?.id
      if (!id) return null

      if (candidateOrders.length > 0) {
        await tx.insert(orderEmailLogItem).values(
          candidateOrders.map((o) => ({
            emailLogId: id,
            sabangnetOrderNumber: o.sabangnetOrderNumber,
            productName: o.productName || '',
            optionName: o.optionName || null,
            quantity: o.quantity ?? 0,
            price: (() => {
              const quantity = o.quantity && o.quantity > 0 ? o.quantity : 1
              return Math.round((o.paymentAmount ?? 0) / quantity)
            })(),
            cost: (() => {
              const quantity = o.quantity && o.quantity > 0 ? o.quantity : 1
              return Math.round((o.cost ?? 0) / quantity)
            })(),
            shippingCost: o.shippingCost ?? 0,
            customerName: o.recipientName || '',
            address: o.address || null,
          })),
        )
      }

      // send 모드일 때만 주문 상태를 processing으로 변경(재발송은 상태 유지)
      if (mode === 'send') {
        await tx.update(order).set({ status: 'processing' }).where(inArray(order.id, orderIdsToSend))
      }

      return id
    })

    if (!emailLogId) {
      return { success: false, error: '발송 기록을 생성하지 못했어요.' }
    }

    // 이메일 발송
    let result: Awaited<ReturnType<typeof sendEmail>> | null = null
    try {
      result = await sendEmail({
        to: toEmails,
        subject,
        text,
        html,
        fromEmail: smtpAccount.email,
        fromName,
        attachments: [
          {
            filename: excelResult.fileName,
            content: excelResult.buffer,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
        ],
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '이메일 발송 중 오류가 발생했어요.'

      await db
        .update(orderEmailLog)
        .set({
          status: 'failed',
          errorMessage,
          sentAt: now,
          sentBy: userEmail,
        })
        .where(eq(orderEmailLog.id, emailLogId))

      if (mode === 'send') {
        await db.update(order).set({ status: 'error' }).where(inArray(order.id, orderIdsToSend))
      }

      return { success: false, error: errorMessage, logId: emailLogId }
    }

    if (result?.messageId) {
      // 2) 발송 성공: 로그 success + 주문 completed 반영
      await db
        .update(orderEmailLog)
        .set({
          status: 'success',
          errorMessage: null,
          sentAt: now,
          sentBy: userEmail,
        })
        .where(eq(orderEmailLog.id, emailLogId))

      if (mode === 'send') {
        await db.update(order).set({ status: 'completed' }).where(inArray(order.id, orderIdsToSend))
      }

      return { success: true, logId: emailLogId, fileName: excelResult.fileName, orderCount, totalAmount }
    } else {
      // 2) 발송 실패: 로그 failed + 주문 error 반영
      await db
        .update(orderEmailLog)
        .set({
          status: 'failed',
          errorMessage: '이메일 발송에 실패했어요.',
          sentAt: now,
          sentBy: userEmail,
        })
        .where(eq(orderEmailLog.id, emailLogId))

      if (mode === 'send') {
        await db.update(order).set({ status: 'error' }).where(inArray(order.id, orderIdsToSend))
      }

      return { success: false, error: '이메일 발송에 실패했어요.', logId: emailLogId }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.'
    return { success: false, error: errorMessage }
  }
}

function formatCurrencyWon(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0
  return `${new Intl.NumberFormat('ko-KR').format(safeAmount)}원`
}

// 한국어 날짜 포맷
function formatDateKorean(date: Date): string {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function normalizeEmails(raw: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()

  for (const item of raw) {
    const trimmed = String(item ?? '')
      .trim()
      .toLowerCase()
    if (trimmed.length === 0) continue
    if (seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
  }

  return out
}

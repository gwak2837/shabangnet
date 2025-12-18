import './server-only'

import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { ORDER_EMAIL_TEMPLATE_SLUG, ORDER_EMAIL_TEMPLATE_VARIABLES } from '../src/common/constants/order-email-template'
import { emailTemplate } from '../src/db/schema/settings'

const DEFAULT_ORDER_EMAIL_SUBJECT = '{{manufacturerName}} 발주서 - {{orderDate}}'

// 이메일 클라이언트 호환성을 위해 <style> 대신 inline style만 사용해요.
// - <script>, <img> 태그는 금지(설정 저장 단계에서도 차단돼요)
const DEFAULT_ORDER_EMAIL_BODY = `\
<div style="font-family: Apple SD Gothic Neo, Malgun Gothic, sans-serif; line-height: 1.6; color: #111; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 24px;">
    <div style="font-size: 22px; font-weight: 700;">발주서</div>
    <div style="margin-top: 8px; color: #666;">{{manufacturerName}}님께</div>
  </div>

  <div style="margin-bottom: 24px;">
    <p style="margin: 0 0 8px;">안녕하세요, {{senderName}}입니다.</p>
    <p style="margin: 0;">아래와 같이 발주서를 보내드려요.</p>
  </div>

  <div style="font-size: 15px; font-weight: 700; margin: 0 0 12px;">발주 정보</div>
  <table style="width: 100%; border-collapse: collapse;">
    <tbody>
      <tr>
        <td style="padding: 8px 0; width: 120px; color: #666;">발주일자</td>
        <td style="padding: 8px 0;">{{orderDate}}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; width: 120px; color: #666;">제조사</td>
        <td style="padding: 8px 0;">{{manufacturerName}}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; width: 120px; color: #666;">주문 건수</td>
        <td style="padding: 8px 0;">{{orderCount}}건</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; width: 120px; color: #666;">총 결제금액</td>
        <td style="padding: 8px 0;">{{totalAmountFormatted}}</td>
      </tr>
      {{#if reason}}
      <tr>
        <td style="padding: 8px 0; width: 120px; color: #666;">비고</td>
        <td style="padding: 8px 0;">{{reason}}</td>
      </tr>
      {{/if}}
    </tbody>
  </table>

  <div style="background: #f5f5f5; padding: 12px 16px; border-radius: 8px; margin-top: 16px;">
    📎 첨부파일을 확인해 주세요.
  </div>

  <div style="border-top: 1px solid #e5e5e5; padding-top: 16px; margin-top: 24px; font-size: 13px; color: #666;">
    <div>본 메일은 자동 발송되었어요.</div>
    <div style="margin-top: 8px;">{{senderName}}</div>
  </div>
</div>
`

function maskDatabaseURL(raw: string): string {
  try {
    const url = new URL(raw)
    if (url.password) url.password = '***'
    return url.toString()
  } catch {
    return raw.replace(/\/\/([^:]+):([^@]+)@/g, '//$1:***@')
  }
}

async function seed() {
  const databaseURL = process.env.SUPABASE_POSTGRES_URL_NON_POOLING

  if (!databaseURL) {
    console.error('❌ SUPABASE_POSTGRES_URL_NON_POOLING environment variable is not set')
    process.exit(1)
  }

  console.log('🌱 Seeding order email template...')
  console.log(`   slug: ${ORDER_EMAIL_TEMPLATE_SLUG}`)
  console.log(`   db: ${maskDatabaseURL(databaseURL)}`)

  const client = postgres(databaseURL, {
    prepare: false,
    max: 1,
    ssl: process.env.SUPABASE_CERTIFICATE
      ? { ca: process.env.SUPABASE_CERTIFICATE, rejectUnauthorized: true }
      : 'prefer',
  })

  const db = drizzle(client)

  try {
    await db
      .insert(emailTemplate)
      .values({
        slug: ORDER_EMAIL_TEMPLATE_SLUG,
        subject: DEFAULT_ORDER_EMAIL_SUBJECT,
        body: DEFAULT_ORDER_EMAIL_BODY,
        variables: ORDER_EMAIL_TEMPLATE_VARIABLES,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: emailTemplate.slug,
        set: {
          subject: sql`excluded.subject`,
          body: sql`excluded.body`,
          variables: sql`excluded.variables`,
          updatedAt: new Date(),
        },
      })

    console.log('✅ Upserted order email template')
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

seed()

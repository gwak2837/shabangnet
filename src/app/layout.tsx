import { QueryProvider } from '@/providers/query-provider'
import type { Metadata } from 'next'
import { Geist, Geist_Mono, Noto_Sans_KR } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const notoSansKr = Noto_Sans_KR({
  variable: '--font-noto-sans-kr',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: '사방넷 발주 자동화',
  description: '주문 취합 및 제조사별 발주 자동화 시스템',
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} ${notoSansKr.variable} font-sans antialiased`}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}

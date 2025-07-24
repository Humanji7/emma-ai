import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import type { ReactNode } from 'react'
import './globals.css'
import { CriticalErrorBoundary } from '@/components/error/ErrorBoundary'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Emma AI - Real-time Relationship Coaching',
  description: 'AI-powered relationship coaching with crisis detection',
}

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <CriticalErrorBoundary>
          {children}
        </CriticalErrorBoundary>
      </body>
    </html>
  )
}
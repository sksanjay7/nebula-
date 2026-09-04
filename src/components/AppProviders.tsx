'use client'
import { SessionProvider } from 'next-auth/react'
import { MailProvider } from '@/context/MailContext'
import { UIControllerProvider } from '@/context/UIControllerContext'
import { ToastProvider } from '@/context/ToastContext'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <UIControllerProvider>
          <MailProvider>
            {children}
          </MailProvider>
        </UIControllerProvider>
      </ToastProvider>
    </SessionProvider>
  )
}

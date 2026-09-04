'use client'
import { useSession } from 'next-auth/react'
import { SignInPage } from '@/components/SignInPage'
import { MailApp } from '@/components/MailApp'

export default function Home() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 16, animation: 'logoBounce 1.5s ease-in-out infinite' }}>✉️</div>
          <div style={{ fontSize: '0.9rem' }}>Loading Aether Mail...</div>
        </div>
      </div>
    )
  }

  if (!session) {
    return <SignInPage />
  }

  return <MailApp />
}

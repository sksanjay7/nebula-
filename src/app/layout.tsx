import type { Metadata } from 'next'
import './globals.css'
import { AppProviders } from '@/components/AppProviders'

export const metadata: Metadata = {
  title: 'Aether Mail — AI-Powered Email Client',
  description: 'A beautiful AI-powered mail client where your assistant controls the UI. Built with Gmail & Gemini.',
  keywords: 'email, AI, Gmail, Gemini, mail client',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>✉️</text></svg>" />
      </head>
      <body>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  )
}

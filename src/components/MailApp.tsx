'use client'
import { useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useMail } from '@/context/MailContext'
import { useUIController } from '@/context/UIControllerContext'
import { Email, MailView, ComposeData } from '@/types'
import { AppHeader } from './AppHeader'
import { Sidebar } from './Sidebar'
import { EmailList } from './EmailList'
import { EmailDetail } from './EmailDetail'
import { ComposeView } from './ComposeView'
import { AIPanel } from './AIPanel'

export function MailApp() {
  const { data: session } = useSession()
  const { state, setView, setEmails, setSentEmails, selectEmail, updateCompose, resetCompose, setLoading, setUnreadCount, setFilter, refresh } = useMail()
  const { register } = useUIController()
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // ─── Fetch Emails ──────────────────────────────────────────────────────────
  const fetchInbox = useCallback(async (query?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ action: 'list', label: 'INBOX' })
      if (query) params.set('q', query)
      const res = await fetch(`/api/gmail?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const { emails } = await res.json()
      setEmails(emails || [])
      // Update unread count
      const unread = (emails || []).filter((e: Email) => !e.isRead).length
      setUnreadCount(unread)
    } catch (e) {
      console.error('Fetch inbox error:', e)
    } finally {
      setLoading(false)
    }
  }, [setEmails, setLoading, setUnreadCount])

  const fetchSent = useCallback(async () => {
    try {
      const res = await fetch('/api/gmail?action=list&label=SENT')
      if (!res.ok) return
      const { emails } = await res.json()
      setSentEmails(emails || [])
    } catch (e) {
      console.error('Fetch sent error:', e)
    }
  }, [setSentEmails])

  // ─── Animated Typing Fill ─────────────────────────────────────────────────
  const animatedFill = useCallback((field: keyof ComposeData, value: string, onDone?: () => void) => {
    let i = 0
    updateCompose({ [field]: '' })
    const type = () => {
      if (i <= value.length) {
        updateCompose({ [field]: value.slice(0, i) })
        i++
        typingTimeoutRef.current = setTimeout(type, 18)
      } else {
        onDone?.()
      }
    }
    type()
  }, [updateCompose])

  // ─── UI Controller Registration ───────────────────────────────────────────
  useEffect(() => {
    register({
      navigateTo: (view: MailView) => {
        setView(view)
        if (view === 'inbox') fetchInbox()
        if (view === 'sent') fetchSent()
      },

      composeEmail: (data: Partial<ComposeData>) => {
        resetCompose()
        setView('compose')

        // Animate each field with delays
        const fields = [
          { key: 'to' as keyof ComposeData, value: data.to || '' },
          { key: 'subject' as keyof ComposeData, value: data.subject || '' },
          { key: 'body' as keyof ComposeData, value: data.body || '' },
        ].filter(f => f.value)

        let delay = 300
        fields.forEach(({ key, value }) => {
          setTimeout(() => animatedFill(key, value), delay)
          delay += value.length * 18 + 400
        })
      },

      searchEmails: (query: string, options = {}) => {
        setView('inbox')
        let gmailQuery = query || ''
        if (options.sender) gmailQuery += ` from:${options.sender}`
        if (options.dateFrom) gmailQuery += ` after:${options.dateFrom}`
        if (options.dateTo) gmailQuery += ` before:${options.dateTo}`
        if (options.unread) gmailQuery += ' is:unread'

        setFilter({ query: gmailQuery })
        fetchInbox(gmailQuery.trim())
      },

      openEmail: async (emailId: string) => {
        // First try to find in current list
        const found = state.emails.find(e => e.id === emailId) || state.sentEmails.find(e => e.id === emailId)
        if (found) {
          selectEmail(found)
          // Mark as read
          fetch('/api/gmail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'mark_read', id: emailId }),
          })
          return
        }
        // Fetch from API
        try {
          const res = await fetch(`/api/gmail?action=get&id=${emailId}`)
          if (res.ok) {
            const email = await res.json()
            selectEmail(email)
          }
        } catch (e) {
          console.error('Open email error:', e)
        }
      },

      filterInbox: ({ sender, keyword, unreadOnly }) => {
        let query = ''
        if (sender) query += `from:${sender} `
        if (keyword) query += keyword + ' '
        if (unreadOnly) query += 'is:unread'
        setFilter({ query: query.trim(), unreadOnly: unreadOnly || false })
        fetchInbox(query.trim() || undefined)
      },
    })
  }, [register, state.emails, state.sentEmails, setView, setFilter, selectEmail, fetchInbox, fetchSent, animatedFill, resetCompose])

  // ─── Initial Load ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (session?.accessToken) {
      fetchInbox()
      // Real-time polling every 30s
      refreshIntervalRef.current = setInterval(() => {
        if (state.view === 'inbox') fetchInbox()
      }, 30000)
    }
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current)
    }
  }, [session?.accessToken]) // eslint-disable-line

  // ─── Refresh trigger ───────────────────────────────────────────────────────
  useEffect(() => {
    if (state.lastRefresh > 0) fetchInbox()
  }, [state.lastRefresh]) // eslint-disable-line

  // ─── Render center column ─────────────────────────────────────────────────
  const renderCenterContent = () => {
    switch (state.view) {
      case 'compose':
        return <ComposeView />
      case 'detail':
        return (
          <div className="main-split">
            <div className="main-split-left">
              <EmailList />
            </div>
            <div className="main-split-right">
              <EmailDetail />
            </div>
          </div>
        )
      case 'sent':
        return (
          <div className="main-split">
            <div className="main-split-left">
              <EmailList emails={state.sentEmails} label="Sent" />
            </div>
            <div className="main-split-right">
              {state.selectedEmail ? <EmailDetail /> : (
                <div className="empty-state">
                  <div className="empty-state-icon">📤</div>
                  <div className="empty-state-title">Select an email</div>
                  <div className="empty-state-desc">Click an email to read it</div>
                </div>
              )}
            </div>
          </div>
        )
      case 'inbox':
      default:
        return (
          <div className="main-split">
            <div className="main-split-left">
              <EmailList />
            </div>
            <div className="main-split-right">
              {state.selectedEmail ? <EmailDetail /> : (
                <div className="empty-state">
                  <div className="empty-state-icon">✉️</div>
                  <div className="empty-state-title">Select an email to read</div>
                  <div className="empty-state-desc">Or ask the AI assistant to find and open specific emails for you</div>
                </div>
              )}
            </div>
          </div>
        )
    }
  }

  return (
    <div className="app-layout">
      <AppHeader />
      <aside className="app-sidebar">
        <Sidebar />
      </aside>
      <main className="app-main">
        {renderCenterContent()}
      </main>
      <aside className="app-ai-panel">
        <AIPanel />
      </aside>
    </div>
  )
}

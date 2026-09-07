'use client'
import { useMail } from '@/context/MailContext'
import { Email } from '@/types'
import { useState } from 'react'

const avatarColors = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#14b8a6']

function getColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function SkeletonList() {
  return (
    <div className="stagger-children">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="skeleton-email">
          <div className="skeleton skeleton-avatar" />
          <div className="skeleton-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <div className="skeleton skeleton-line w-60" />
              <div className="skeleton skeleton-line w-30" />
            </div>
            <div className="skeleton skeleton-line w-80" />
            <div className="skeleton skeleton-line w-40" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface EmailListProps {
  emails?: Email[]
  label?: string
}

export function EmailList({ emails: propEmails, label }: EmailListProps) {
  const { state, selectEmail, markRead } = useMail()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const emails = propEmails || state.emails
  const displayLabel = label || (state.view === 'sent' ? 'Sent' : 'Inbox')
  const filtered = filter === 'unread' ? emails.filter(e => !e.isRead) : emails

  const handleClick = async (email: Email) => {
    selectEmail(email)
    if (!email.isRead) {
      markRead(email.id)
      fetch('/api/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', id: email.id }),
      }).catch(console.error)
    }
  }

  return (
    <>
      <div className="email-list-header">
        <h2>{displayLabel}</h2>
        <span className="count-badge">{filtered.length}</span>
      </div>

      <div className="filter-bar">
        <button className={`filter-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          All
        </button>
        <button className={`filter-chip ${filter === 'unread' ? 'active' : ''}`} onClick={() => setFilter('unread')}>
          🔵 Unread
        </button>
      </div>

      <div className="email-list" id="email-list">
        {state.isLoading ? (
          <SkeletonList />
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: 40 }}>
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-title">No emails found</div>
            <div className="empty-state-desc">
              {state.filter.query ? 'Try a different search' : 'Your inbox is empty'}
            </div>
          </div>
        ) : (
          <div className="stagger-children">
            {filtered.map(email => (
              <div
                key={email.id}
                id={`email-item-${email.id}`}
                className={`email-item ${!email.isRead ? 'unread' : ''} ${state.selectedEmail?.id === email.id ? 'active' : ''}`}
                onClick={() => handleClick(email)}
              >
                <div className="email-avatar" style={{ background: getColor(email.fromName) }}>
                  {getInitials(email.fromName)}
                </div>
                <div className="email-content">
                  <div className="email-meta">
                    <span className="email-sender">{email.fromName}</span>
                    <span className="email-date">{email.date}</span>
                  </div>
                  <div className="email-subject">{email.subject}</div>
                  <div className="email-preview">{email.snippet}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

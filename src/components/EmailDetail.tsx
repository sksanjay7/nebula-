'use client'
import { useState } from 'react'
import { useMail } from '@/context/MailContext'
import { useToast } from '@/context/ToastContext'

const avatarColors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6']
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

export function EmailDetail() {
  const { state, setView, selectEmail, updateCompose, resetCompose } = useMail()
  const toast = useToast()
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyBody, setReplyBody] = useState('')
  const [sending, setSending] = useState(false)

  const email = state.selectedEmail
  if (!email) return null

  const color = getColor(email.fromName)
  const initials = getInitials(email.fromName)

  const handleReply = async () => {
    if (!replyBody.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          to: email.fromEmail,
          subject: `Re: ${email.subject}`,
          emailBody: replyBody,
          replyToId: email.id,
        }),
      })
      if (res.ok) {
        toast.success('Reply sent!')
        setReplyBody('')
        setReplyOpen(false)
      } else {
        toast.error('Failed to send reply')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSending(false)
    }
  }

  const handleForward = () => {
    resetCompose()
    updateCompose({
      subject: `Fwd: ${email.subject}`,
      body: `\n\n------- Forwarded Message -------\nFrom: ${email.from}\nSubject: ${email.subject}\n\n${email.body}`,
    })
    setView('compose')
    selectEmail(null)
  }

  const handleBack = () => {
    selectEmail(null)
    setView('inbox')
  }

  // Render body — prefer HTML, fallback to text
  const renderBody = () => {
    if (email.bodyHtml) {
      return (
        <div
          className="email-detail-body"
          dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
          style={{ whiteSpace: 'normal' }}
        />
      )
    }
    return <div className="email-detail-body">{email.body || email.snippet}</div>
  }

  return (
    <div className="email-detail" id="email-detail">
      {/* Header actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button className="btn btn-ghost" onClick={handleBack} id="email-back-btn">
          ← Back
        </button>
      </div>

      <div className="email-detail-header">
        <div className="email-detail-subject">{email.subject}</div>
        <div className="email-detail-meta">
          <div
            className="email-detail-avatar"
            style={{ background: color }}
          >
            {initials}
          </div>
          <div className="email-detail-sender-info">
            <div className="email-detail-sender-name">{email.fromName}</div>
            <div className="email-detail-sender-addr">{email.fromEmail}</div>
          </div>
          <div className="email-detail-date-full">
            {new Date(email.dateRaw).toLocaleString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric',
              year: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </div>
        </div>
      </div>

      {renderBody()}

      <div className="email-actions">
        <button
          id="reply-btn"
          className="btn btn-primary"
          onClick={() => setReplyOpen(!replyOpen)}
        >
          ↩️ Reply
        </button>
        <button
          id="forward-btn"
          className="btn btn-secondary"
          onClick={handleForward}
        >
          ↪️ Forward
        </button>
      </div>

      {/* Inline reply */}
      {replyOpen && (
        <div style={{ marginTop: 20 }}>
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-lg)',
              padding: 16,
              animation: 'slideIn 0.2s ease',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>
              Replying to <strong style={{ color: 'var(--text-primary)' }}>{email.fromName}</strong>
            </div>
            <textarea
              id="reply-textarea"
              value={replyBody}
              onChange={e => setReplyBody(e.target.value)}
              placeholder="Write your reply..."
              style={{
                width: '100%',
                minHeight: 120,
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-secondary)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                resize: 'none',
                outline: 'none',
                lineHeight: 1.6,
              }}
              onFocus={e => {
                e.target.style.borderColor = 'var(--accent-primary)'
                e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)'
              }}
              onBlur={e => {
                e.target.style.borderColor = 'var(--border-secondary)'
                e.target.style.boxShadow = 'none'
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                id="send-reply-btn"
                className="btn btn-primary"
                onClick={handleReply}
                disabled={sending}
              >
                {sending ? 'Sending...' : '✈️ Send Reply'}
              </button>
              <button className="btn btn-ghost" onClick={() => setReplyOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

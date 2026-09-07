'use client'
import { useState } from 'react'
import { useMail } from '@/context/MailContext'
import { useToast } from '@/context/ToastContext'

const avatarColors = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#14b8a6']
function getColor(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return avatarColors[Math.abs(h) % avatarColors.length]
}
function getInitials(name: string) {
  const p = name.trim().split(' ')
  return p.length >= 2 ? (p[0][0] + p[p.length-1][0]).toUpperCase() : name.slice(0,2).toUpperCase()
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

  const handleReply = async () => {
    if (!replyBody.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', to: email.fromEmail, subject: `Re: ${email.subject}`, emailBody: replyBody }),
      })
      if (res.ok) { toast.success('Reply sent! 🎉'); setReplyBody(''); setReplyOpen(false) }
      else toast.error('Failed to send reply')
    } catch { toast.error('Network error') }
    finally { setSending(false) }
  }

  const handleForward = () => {
    resetCompose(); updateCompose({ subject: `Fwd: ${email.subject}`, body: `\n\n---\nFrom: ${email.from}\n\n${email.body}` })
    setView('compose'); selectEmail(null)
  }

  return (
    <div className="email-detail" id="email-detail">
      {/* Back */}
      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-ghost" onClick={() => { selectEmail(null); setView('inbox') }} id="email-back-btn">
          ← Back
        </button>
      </div>

      {/* Subject */}
      <div className="email-detail-subject">{email.subject}</div>

      {/* Sender meta card */}
      <div className="email-detail-meta">
        <div className="email-detail-avatar" style={{ background: color }}>
          {getInitials(email.fromName)}
        </div>
        <div className="email-detail-sender-info">
          <div className="email-detail-sender-name">{email.fromName}</div>
          <div className="email-detail-sender-addr">{email.fromEmail}</div>
        </div>
        <div className="email-detail-date-full">
          {new Date(email.dateRaw).toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
        </div>
      </div>

      {/* Body */}
      {email.bodyHtml
        ? <div className="email-detail-body" dangerouslySetInnerHTML={{ __html: email.bodyHtml }} style={{ whiteSpace: 'normal' }} />
        : <div className="email-detail-body">{email.body || email.snippet}</div>
      }

      {/* Actions */}
      <div className="email-actions">
        <button id="reply-btn" className="btn btn-primary" onClick={() => setReplyOpen(!replyOpen)}>
          ↩️ Reply
        </button>
        <button id="forward-btn" className="btn btn-secondary" onClick={handleForward}>
          ↪️ Forward
        </button>
      </div>

      {/* Inline reply */}
      {replyOpen && (
        <div style={{ marginTop: 20, animation: 'detailReveal 0.25s var(--t-spring)' }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--r-xl)', padding: 20, boxShadow: 'var(--shadow-card)',
          }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
              Replying to <strong style={{ color: 'var(--text-primary)' }}>{email.fromName}</strong>
            </div>
            <textarea
              id="reply-textarea"
              value={replyBody}
              onChange={e => setReplyBody(e.target.value)}
              placeholder="Write your reply..."
              style={{
                width: '100%', minHeight: 120, background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-lg)',
                padding: '12px 16px', color: 'var(--text-primary)', fontSize: '0.9rem',
                resize: 'none', outline: 'none', lineHeight: 1.6,
                transition: 'all var(--t-base)',
              }}
              onFocus={e => { (e.target as HTMLElement).style.borderColor = 'var(--accent-primary)'; (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)' }}
              onBlur={e => { (e.target as HTMLElement).style.borderColor = 'var(--border-subtle)'; (e.target as HTMLElement).style.boxShadow = 'none' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button id="send-reply-btn" className="btn btn-primary" onClick={handleReply} disabled={sending}>
                {sending ? <><span className="spin">⟳</span> Sending...</> : '✈️ Send Reply'}
              </button>
              <button className="btn btn-ghost" onClick={() => setReplyOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'
import { useState } from 'react'
import { useMail } from '@/context/MailContext'
import { useToast } from '@/context/ToastContext'

export function ComposeView() {
  const { state, setView, resetCompose, updateCompose, refresh } = useMail()
  const toast = useToast()
  const [sending, setSending] = useState(false)
  const [showCcBcc, setShowCcBcc] = useState(false)
  const { compose } = state

  const handleSend = async () => {
    if (!compose.to.trim()) { toast.error('Please enter a recipient'); return }
    if (!compose.subject.trim()) { toast.error('Please add a subject'); return }
    setSending(true)
    try {
      const res = await fetch('/api/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', to: compose.to, subject: compose.subject, emailBody: compose.body }),
      })
      if (res.ok) {
        toast.success('Email sent! 🎉')
        resetCompose(); setView('inbox')
        setTimeout(() => refresh(), 1500)
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to send')
      }
    } catch { toast.error('Network error') }
    finally { setSending(false) }
  }

  return (
    <div className="compose-view">
      {/* Header */}
      <div className="compose-header">
        <div className="compose-title">✏️ New Message</div>
        <button
          id="discard-email-btn"
          className="btn btn-ghost"
          onClick={() => { resetCompose(); setView('inbox') }}
          style={{ marginLeft: 'auto' }}
        >
          ✕ Discard
        </button>
      </div>

      {/* Form card */}
      <div className="compose-form">
        {/* To */}
        <div className="compose-field">
          <label htmlFor="compose-to">To</label>
          <input
            id="compose-to"
            type="email"
            placeholder="recipient@example.com"
            value={compose.to}
            onChange={e => updateCompose({ to: e.target.value })}
          />
          <button
            onClick={() => setShowCcBcc(!showCcBcc)}
            style={{
              fontSize: '0.72rem', color: 'var(--text-secondary)', padding: '14px 16px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontWeight: 600, flexShrink: 0, opacity: 0.7,
            }}
          >
            {showCcBcc ? 'Hide' : 'Cc/Bcc'}
          </button>
        </div>

        {/* CC */}
        {showCcBcc && (
          <div className="compose-field" style={{ animation: 'staggerFadeUp 0.25s var(--t-spring)' }}>
            <label htmlFor="compose-cc">Cc</label>
            <input id="compose-cc" type="email" placeholder="cc@example.com"
              value={compose.cc || ''} onChange={e => updateCompose({ cc: e.target.value })} />
          </div>
        )}

        {/* BCC */}
        {showCcBcc && (
          <div className="compose-field" style={{ animation: 'staggerFadeUp 0.3s var(--t-spring)' }}>
            <label htmlFor="compose-bcc">Bcc</label>
            <input id="compose-bcc" type="email" placeholder="bcc@example.com"
              value={compose.bcc || ''} onChange={e => updateCompose({ bcc: e.target.value })} />
          </div>
        )}

        {/* Subject */}
        <div className="compose-field">
          <label htmlFor="compose-subject">Subject</label>
          <input
            id="compose-subject"
            type="text"
            placeholder="Email subject"
            value={compose.subject}
            onChange={e => updateCompose({ subject: e.target.value })}
          />
        </div>

        {/* Body */}
        <div className="compose-field">
          <label htmlFor="compose-body" style={{ paddingTop: 16 }}>Message</label>
          <textarea
            id="compose-body"
            placeholder="Write your message..."
            value={compose.body}
            onChange={e => updateCompose({ body: e.target.value })}
            rows={14}
          />
        </div>

        {/* Toolbar */}
        <div className="compose-toolbar">
          <button
            id="send-email-btn"
            className="btn btn-primary"
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? (
              <><span className="spin">⟳</span> Sending...</>
            ) : '✈️ Send'}
          </button>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn-icon" title="Attach file">📎</button>
            <button className="btn-icon" title="Emoji">😊</button>
          </div>
        </div>
      </div>
    </div>
  )
}

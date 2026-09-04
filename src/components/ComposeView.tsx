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
    if (!compose.subject.trim()) { toast.error('Please enter a subject'); return }

    setSending(true)
    try {
      const res = await fetch('/api/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          to: compose.to,
          subject: compose.subject,
          emailBody: compose.body,
        }),
      })

      if (res.ok) {
        toast.success('Email sent! 🎉')
        resetCompose()
        setView('inbox')
        setTimeout(() => refresh(), 1500)
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to send email')
      }
    } catch {
      toast.error('Network error — check your connection')
    } finally {
      setSending(false)
    }
  }

  const handleDiscard = () => {
    resetCompose()
    setView('inbox')
  }

  return (
    <div className="compose-view">
      <div className="compose-title">✏️ New Message</div>

      <div className="compose-form">
        <div className="compose-field">
          <label htmlFor="compose-to">To</label>
          <input
            id="compose-to"
            type="email"
            placeholder="recipient@example.com"
            value={compose.to}
            onChange={e => updateCompose({ to: e.target.value })}
          />
        </div>

        {showCcBcc && (
          <>
            <div className="compose-field">
              <label htmlFor="compose-cc">Cc</label>
              <input
                id="compose-cc"
                type="email"
                placeholder="cc@example.com"
                value={compose.cc || ''}
                onChange={e => updateCompose({ cc: e.target.value })}
              />
            </div>
            <div className="compose-field">
              <label htmlFor="compose-bcc">Bcc</label>
              <input
                id="compose-bcc"
                type="email"
                placeholder="bcc@example.com"
                value={compose.bcc || ''}
                onChange={e => updateCompose({ bcc: e.target.value })}
              />
            </div>
          </>
        )}

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

        <div className="compose-field">
          <label htmlFor="compose-body">Message</label>
          <textarea
            id="compose-body"
            placeholder="Write your message..."
            value={compose.body}
            onChange={e => updateCompose({ body: e.target.value })}
            rows={14}
          />
        </div>

        <div className="compose-toolbar">
          <button
            id="send-email-btn"
            className="btn btn-primary"
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? (
              <>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
                Sending...
              </>
            ) : '✈️ Send'}
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => setShowCcBcc(!showCcBcc)}
          >
            {showCcBcc ? 'Hide Cc/Bcc' : 'Cc / Bcc'}
          </button>

          <button
            id="discard-email-btn"
            className="btn btn-danger"
            onClick={handleDiscard}
            style={{ marginLeft: 'auto' }}
          >
            🗑️ Discard
          </button>
        </div>
      </div>
    </div>
  )
}

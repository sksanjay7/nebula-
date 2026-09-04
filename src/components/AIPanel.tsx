'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useMail } from '@/context/MailContext'
import { useUIController } from '@/context/UIControllerContext'
import { useToast } from '@/context/ToastContext'
import { AIMessage, ComposeData, MailView } from '@/types'

const WELCOME_MESSAGE: AIMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `Hi! I'm **Aether**, your AI email assistant. I can control this app for you.\n\nTry saying:\n• "Send an email to alice@example.com about the meeting"\n• "Show emails from last week"\n• "Find emails from John"\n• "Open the latest email"\n• "Compose a reply to the current email"`,
  timestamp: new Date(),
}

const SUGGESTIONS = [
  "Show unread emails",
  "Compose a new email",
  "Find emails from last week",
  "Search for emails about meeting",
]

export function AIPanel() {
  const { data: session } = useSession()
  const { state, setView, updateCompose, resetCompose, setEmails, setLoading, selectEmail, setFilter } = useMail()
  const { execute } = useUIController()
  const toast = useToast()

  const [messages, setMessages] = useState<AIMessage[]>([WELCOME_MESSAGE])
  const [inputValue, setInputValue] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [pendingConfirmation, setPendingConfirmation] = useState<AIMessage | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const historyRef = useRef<Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>>([])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, isThinking, scrollToBottom])

  const addMessage = useCallback((msg: Omit<AIMessage, 'id' | 'timestamp'>) => {
    const newMsg: AIMessage = { ...msg, id: Math.random().toString(36).slice(2), timestamp: new Date() }
    setMessages(prev => [...prev, newMsg])
    return newMsg
  }, [])

  // Execute AI function calls and map to UI actions
  const executeFunctionCall = useCallback(async (
    name: string,
    args: Record<string, unknown>
  ): Promise<{ actionDesc: string; emailPreviews?: AIMessage['emailPreviews']; requiresConfirmation?: boolean; confirmationData?: AIMessage['confirmationData'] }> => {

    switch (name) {
      case 'navigate_to': {
        const view = args.view as MailView
        execute('navigateTo', view)
        if (view === 'sent') {
          const res = await fetch('/api/gmail?action=list&label=SENT')
          if (res.ok) {
            const { emails } = await res.json()
            // setSentEmails handled in MailApp via navigateTo
          }
        }
        return { actionDesc: `Navigated to ${view}` }
      }

      case 'compose_email': {
        const data: Partial<ComposeData> = {
          to: (args.to as string) || '',
          subject: (args.subject as string) || '',
          body: (args.body as string) || '',
        }
        execute('composeEmail', data)
        return { actionDesc: `Opening compose${args.to ? ` → ${args.to}` : ''}` }
      }

      case 'search_emails': {
        const opts = {
          sender: args.sender as string,
          dateFrom: parseDateArg(args.dateFrom as string),
          dateTo: parseDateArg(args.dateTo as string),
          unread: args.unreadOnly as boolean,
        }
        execute('searchEmails', (args.query as string) || '', opts)
        return { actionDesc: `Searching: "${args.query || ''}"${opts.sender ? ` from ${opts.sender}` : ''}` }
      }

      case 'open_email': {
        const emailId = args.emailId as string
        await execute('openEmail', emailId)
        return { actionDesc: `Opening email…` }
      }

      case 'send_email': {
        // This triggers confirmation — don't send immediately
        return {
          actionDesc: `Ready to send to ${args.to}`,
          requiresConfirmation: true,
          confirmationData: {
            type: 'send',
            to: args.to as string,
            subject: args.subject as string,
            body: args.body as string,
          },
        }
      }

      case 'reply_to_current': {
        if (!state.selectedEmail) {
          return { actionDesc: 'No email is currently open' }
        }
        const email = state.selectedEmail
        resetCompose()
        updateCompose({
          to: email.fromEmail,
          subject: `Re: ${email.subject}`,
          body: (args.body as string) || '',
        })
        setView('compose')
        return { actionDesc: `Replying to ${email.fromName}` }
      }

      case 'get_email_info': {
        const infoType = args.infoType as string
        if (infoType === 'current_open' && state.selectedEmail) {
          return {
            actionDesc: `Found: "${state.selectedEmail.subject}"`,
            emailPreviews: [state.selectedEmail],
          }
        }
        if (infoType === 'list_visible') {
          return {
            actionDesc: `${state.emails.length} emails visible`,
            emailPreviews: state.emails.slice(0, 3),
          }
        }
        const unread = state.emails.filter(e => !e.isRead)
        return { actionDesc: `${unread.length} unread emails` }
      }

      default:
        return { actionDesc: `Executed: ${name}` }
    }
  }, [state, execute, setView, updateCompose, resetCompose])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isThinking) return

    const userMsg = addMessage({ role: 'user', content: text })
    setInputValue('')
    setIsThinking(true)

    // Build context for Gemini
    const context = {
      currentView: state.view,
      openEmailId: state.selectedEmail?.id,
      openEmailSubject: state.selectedEmail?.subject,
      openEmailFrom: state.selectedEmail?.fromName,
      visibleEmails: state.emails.slice(0, 10).map(e => ({
        id: e.id,
        from: e.fromName,
        subject: e.subject,
        date: e.date,
        isRead: e.isRead,
      })),
      userEmail: session?.user?.email || undefined,
    }

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyRef.current,
          context,
        }),
      })

      const data = await res.json()

      // Update chat history for Gemini
      historyRef.current = [
        ...historyRef.current,
        { role: 'user', parts: [{ text }] },
        { role: 'model', parts: [{ text: data.text || '' }] },
      ]

      // Execute any function calls
      let actionDesc = ''
      let emailPreviews: AIMessage['emailPreviews']
      let requiresConfirmation = false
      let confirmationData: AIMessage['confirmationData']

      for (const fnCall of (data.functionCalls || [])) {
        const result = await executeFunctionCall(fnCall.name, fnCall.args)
        actionDesc = result.actionDesc
        if (result.emailPreviews) emailPreviews = result.emailPreviews
        if (result.requiresConfirmation) {
          requiresConfirmation = true
          confirmationData = result.confirmationData
        }
      }

      const assistantMsg = addMessage({
        role: 'assistant',
        content: data.text || (actionDesc ? '' : 'Done!'),
        action: actionDesc ? { type: 'info', description: actionDesc } : undefined,
        emailPreviews,
        requiresConfirmation,
        confirmationData,
      })

      if (requiresConfirmation) {
        setPendingConfirmation(assistantMsg)
      }
    } catch (error) {
      addMessage({
        role: 'assistant',
        content: 'Sorry, I ran into an error. Please try again.',
      })
    } finally {
      setIsThinking(false)
    }
  }, [isThinking, state, session, addMessage, executeFunctionCall])

  const handleConfirmSend = async (confirmed: boolean) => {
    if (!pendingConfirmation?.confirmationData) return
    setPendingConfirmation(null)

    if (!confirmed) {
      addMessage({ role: 'assistant', content: 'Send cancelled. The email was not sent.' })
      return
    }

    const { to, subject, body } = pendingConfirmation.confirmationData
    addMessage({ role: 'assistant', content: '📤 Sending your email...' })

    try {
      const res = await fetch('/api/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', to, subject, emailBody: body }),
      })
      if (res.ok) {
        addMessage({ role: 'assistant', content: `✅ Email sent to **${to}**!` })
        toast.success('Email sent!')
      } else {
        const err = await res.json()
        addMessage({ role: 'assistant', content: `❌ Failed to send: ${err.error}` })
      }
    } catch {
      addMessage({ role: 'assistant', content: '❌ Network error — could not send.' })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputValue)
    }
  }

  // Format message content (basic markdown)
  const formatContent = (content: string) => {
    return content
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code style="background:var(--bg-tertiary);padding:2px 6px;border-radius:4px;font-family:var(--font-mono);font-size:0.8em">$1</code>')
      .replace(/\n/g, '<br/>')
      .replace(/•\s/g, '• ')
  }

  return (
    <>
      {/* Panel Header */}
      <div className="ai-panel-header">
        <div style={{ fontSize: 22 }}>🤖</div>
        <div className="ai-panel-title">Aether AI</div>
        <div className="ai-status">
          <div className="ai-status-dot" />
          {isThinking ? 'Thinking...' : 'Ready'}
        </div>
        <button
          className="btn-icon"
          onClick={() => {
            setMessages([WELCOME_MESSAGE])
            historyRef.current = []
            setPendingConfirmation(null)
          }}
          title="Clear chat"
          style={{ width: 28, height: 28 }}
        >
          ↺
        </button>
      </div>

      {/* Messages */}
      <div className="ai-messages" id="ai-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`ai-message ${msg.role}`}>
            {msg.role === 'assistant' && (
              <div className="ai-avatar">🤖</div>
            )}
            <div>
              <div className="ai-bubble" dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} />

              {/* Action indicator */}
              {msg.action && msg.action.description && (
                <div className="ai-action-card">
                  <span className="action-icon">⚡</span>
                  {msg.action.description}
                </div>
              )}

              {/* Email previews */}
              {msg.emailPreviews && msg.emailPreviews.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {msg.emailPreviews.map(email => (
                    <div
                      key={email.id}
                      className="ai-email-preview"
                      onClick={() => execute('openEmail', email.id)}
                    >
                      <div className="preview-sender">{email.fromName}</div>
                      <div className="preview-subject">{email.subject}</div>
                      <div className="preview-date">{email.date}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Confirmation UI */}
              {msg.requiresConfirmation && msg.id === pendingConfirmation?.id && msg.confirmationData && (
                <div className="ai-confirm-bar">
                  <div className="confirm-text">
                    ⚠️ Send email to <strong>{msg.confirmationData.to}</strong>?
                    <br />
                    <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Subject: {msg.confirmationData.subject}</span>
                  </div>
                  <div className="confirm-actions">
                    <button
                      id="confirm-send-btn"
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                      onClick={() => handleConfirmSend(true)}
                    >
                      ✓ Send
                    </button>
                    <button
                      id="cancel-send-btn"
                      className="btn btn-secondary"
                      style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                      onClick={() => handleConfirmSend(false)}
                    >
                      ✕ Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Thinking animation */}
        {isThinking && (
          <div className="ai-message assistant">
            <div className="ai-avatar">🤖</div>
            <div className="ai-bubble">
              <div className="ai-thinking">
                <div className="ai-thinking-dot" />
                <div className="ai-thinking-dot" />
                <div className="ai-thinking-dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion chips */}
      {messages.length <= 1 && (
        <div style={{ padding: '0 12px 8px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              className="filter-chip"
              style={{ fontSize: '0.75rem' }}
              onClick={() => sendMessage(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="ai-input-area">
        <textarea
          ref={inputRef}
          id="ai-input"
          className="ai-input"
          placeholder="Ask me anything about your email..."
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          id="ai-send-btn"
          className="ai-send-btn"
          onClick={() => sendMessage(inputValue)}
          disabled={isThinking || !inputValue.trim()}
        >
          ↑
        </button>
      </div>
    </>
  )
}

// ─── Utility: Parse natural language dates ────────────────────────────────────
function parseDateArg(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined

  // Already looks like a date
  if (/\d{4}\/\d{2}\/\d{2}/.test(dateStr)) return dateStr

  const now = new Date()
  const lower = dateStr.toLowerCase()

  if (lower.includes('today')) return formatGmailDate(now)
  if (lower.includes('yesterday')) {
    const d = new Date(now)
    d.setDate(d.getDate() - 1)
    return formatGmailDate(d)
  }

  const match = lower.match(/(\d+)\s*(day|week|month)s?\s*ago/)
  if (match) {
    const n = parseInt(match[1])
    const unit = match[2]
    const d = new Date(now)
    if (unit === 'day') d.setDate(d.getDate() - n)
    if (unit === 'week') d.setDate(d.getDate() - n * 7)
    if (unit === 'month') d.setMonth(d.getMonth() - n)
    return formatGmailDate(d)
  }

  if (lower.includes('last week')) {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    return formatGmailDate(d)
  }

  if (lower.includes('last month')) {
    const d = new Date(now)
    d.setMonth(d.getMonth() - 1)
    return formatGmailDate(d)
  }

  return undefined
}

function formatGmailDate(d: Date): string {
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

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
  content: `Hi! I'm **Aether**, your AI email assistant powered by Gemini.\n\nI can control this entire app for you:\n• **Navigate** between views\n• **Compose** emails with animated typing\n• **Search** your inbox naturally\n• **Open** and **reply** to emails`,
  timestamp: new Date(),
}

const SUGGESTIONS = [
  '📬 Show unread emails',
  '✏️ Compose a new email',
  '🔍 Search last week',
  '📤 Open latest email',
]

export function AIPanel() {
  const { data: session } = useSession()
  const { state, setView, updateCompose, resetCompose, setEmails, selectEmail, setFilter } = useMail()
  const { execute } = useUIController()
  const toast = useToast()

  const [messages, setMessages] = useState<AIMessage[]>([WELCOME_MESSAGE])
  const [inputValue, setInputValue] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [pendingConfirmation, setPendingConfirmation] = useState<AIMessage | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const historyRef = useRef<Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>>([])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  const addMessage = useCallback((msg: Omit<AIMessage, 'id' | 'timestamp'>) => {
    const m: AIMessage = { ...msg, id: Math.random().toString(36).slice(2), timestamp: new Date() }
    setMessages(prev => [...prev, m])
    return m
  }, [])

  const executeFunctionCall = useCallback(async (name: string, args: Record<string, unknown>) => {
    switch (name) {
      case 'navigate_to':
        execute('navigateTo', args.view as MailView)
        return { actionDesc: `📂 Navigated to ${args.view}` }

      case 'compose_email':
        execute('composeEmail', { to: args.to, subject: args.subject, body: args.body } as Partial<ComposeData>)
        return { actionDesc: `✏️ Opening compose${args.to ? ` → ${args.to}` : ''}` }

      case 'search_emails':
        execute('searchEmails', (args.query as string) || '', {
          sender: args.sender as string,
          dateFrom: parseDateArg(args.dateFrom as string),
          dateTo: parseDateArg(args.dateTo as string),
          unread: args.unreadOnly as boolean,
        })
        return { actionDesc: `🔍 Searching: "${args.query || ''}"` }

      case 'open_email':
        await execute('openEmail', args.emailId as string)
        return { actionDesc: `📖 Opening email…` }

      case 'send_email':
        return {
          actionDesc: `Ready to send to ${args.to}`,
          requiresConfirmation: true,
          confirmationData: { type: 'send', to: args.to as string, subject: args.subject as string, body: args.body as string },
        }

      case 'reply_to_current':
        if (!state.selectedEmail) return { actionDesc: 'No email is open' }
        resetCompose()
        updateCompose({ to: state.selectedEmail.fromEmail, subject: `Re: ${state.selectedEmail.subject}`, body: args.body as string || '' })
        setView('compose')
        return { actionDesc: `↩️ Replying to ${state.selectedEmail.fromName}` }

      case 'get_email_info':
        if (args.infoType === 'current_open' && state.selectedEmail)
          return { actionDesc: `📧 Found: "${state.selectedEmail.subject}"`, emailPreviews: [state.selectedEmail] }
        return { actionDesc: `📬 ${state.emails.filter(e => !e.isRead).length} unread emails` }

      default:
        return { actionDesc: `✅ Executed: ${name}` }
    }
  }, [state, execute, setView, updateCompose, resetCompose])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isThinking) return
    addMessage({ role: 'user', content: text })
    setInputValue('')
    setIsThinking(true)

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyRef.current,
          context: {
            currentView: state.view,
            openEmailSubject: state.selectedEmail?.subject,
            openEmailFrom: state.selectedEmail?.fromName,
            visibleEmails: state.emails.slice(0, 10).map(e => ({ id: e.id, from: e.fromName, subject: e.subject, isRead: e.isRead })),
            userEmail: session?.user?.email,
          },
        }),
      })

      const data = await res.json()
      historyRef.current = [
        ...historyRef.current,
        { role: 'user', parts: [{ text }] },
        { role: 'model', parts: [{ text: data.text || '' }] },
      ]

      let actionDesc = '', emailPreviews: AIMessage['emailPreviews'], requiresConfirmation = false, confirmationData: AIMessage['confirmationData']

      for (const fn of (data.functionCalls || [])) {
        const r = await executeFunctionCall(fn.name, fn.args)
        actionDesc = r.actionDesc
        if (r.emailPreviews) emailPreviews = r.emailPreviews
        if (r.requiresConfirmation) { requiresConfirmation = true; confirmationData = r.confirmationData }
      }

      const assistantMsg = addMessage({
        role: 'assistant',
        content: data.text || '',
        action: actionDesc ? { type: 'info', description: actionDesc } : undefined,
        emailPreviews,
        requiresConfirmation,
        confirmationData,
      })

      if (requiresConfirmation) setPendingConfirmation(assistantMsg)
    } catch {
      addMessage({ role: 'assistant', content: 'Sorry, something went wrong. Please try again.' })
    } finally {
      setIsThinking(false)
    }
  }, [isThinking, state, session, addMessage, executeFunctionCall])

  const handleConfirmSend = async (confirmed: boolean) => {
    if (!pendingConfirmation?.confirmationData) return
    setPendingConfirmation(null)
    if (!confirmed) { addMessage({ role: 'assistant', content: 'Got it — email cancelled. ❌' }); return }
    const { to, subject, body } = pendingConfirmation.confirmationData
    addMessage({ role: 'assistant', content: '📤 Sending...' })
    try {
      const res = await fetch('/api/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', to, subject, emailBody: body }),
      })
      if (res.ok) { addMessage({ role: 'assistant', content: `✅ Email sent to **${to}**!` }); toast.success('Sent!') }
      else addMessage({ role: 'assistant', content: '❌ Failed to send.' })
    } catch { addMessage({ role: 'assistant', content: '❌ Network error.' }) }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(inputValue) }
  }

  const formatContent = (content: string) =>
    content
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code style="background:rgba(99,102,241,0.1);padding:1px 5px;border-radius:4px;font-family:var(--font-mono);font-size:0.82em;color:var(--text-accent)">$1</code>')
      .replace(/•\s/g, '• ')
      .replace(/\n/g, '<br/>')

  return (
    <>
      {/* Header */}
      <div className="ai-panel-header">
        <div style={{ fontSize: 20 }}>🤖</div>
        <div className="ai-panel-title">Aether AI</div>
        <span className="ai-model-tag">Gemini</span>
        <div className="ai-status">
          <div className="ai-status-dot" />
          {isThinking ? 'Thinking...' : 'Online'}
        </div>
        <button
          className="btn-icon"
          onClick={() => { setMessages([WELCOME_MESSAGE]); historyRef.current = []; setPendingConfirmation(null) }}
          title="Clear chat"
          style={{ width: 28, height: 28, fontSize: 13 }}
        >
          ↺
        </button>
      </div>

      {/* Messages */}
      <div className="ai-messages" id="ai-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`ai-message ${msg.role}`}>
            {msg.role === 'assistant' && <div className="ai-avatar">🤖</div>}
            <div>
              {msg.content && (
                <div className="ai-bubble" dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} />
              )}

              {msg.action?.description && (
                <div className="ai-action-card">
                  <span>{msg.action.description}</span>
                </div>
              )}

              {msg.emailPreviews?.map(email => (
                <div key={email.id} className="ai-email-preview" onClick={() => execute('openEmail', email.id)}>
                  <div className="preview-sender">{email.fromName}</div>
                  <div className="preview-subject">{email.subject}</div>
                  <div className="preview-date">{email.date}</div>
                </div>
              ))}

              {msg.requiresConfirmation && msg.id === pendingConfirmation?.id && msg.confirmationData && (
                <div className="ai-confirm-bar">
                  <div className="confirm-text">
                    Send to <strong>{msg.confirmationData.to}</strong>?<br />
                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{msg.confirmationData.subject}</span>
                  </div>
                  <div className="confirm-actions">
                    <button id="confirm-send-btn" className="btn btn-primary"
                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      onClick={() => handleConfirmSend(true)}>
                      ✓ Send
                    </button>
                    <button id="cancel-send-btn" className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      onClick={() => handleConfirmSend(false)}>
                      ✕ Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Thinking */}
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
        <div className="ai-suggestions">
          {SUGGESTIONS.map(s => (
            <button key={s} className="ai-suggestion-chip" onClick={() => sendMessage(s.replace(/^[^\s]+ /, ''))}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="ai-input-area">
        <textarea
          ref={inputRef}
          id="ai-input"
          className="ai-input"
          placeholder="Ask me to control your inbox..."
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

function parseDateArg(s?: string): string | undefined {
  if (!s) return undefined
  const now = new Date(), l = s.toLowerCase()
  const fmt = (d: Date) => `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
  if (l.includes('today')) return fmt(now)
  if (l.includes('yesterday')) { const d = new Date(now); d.setDate(d.getDate()-1); return fmt(d) }
  if (l.includes('last week')) { const d = new Date(now); d.setDate(d.getDate()-7); return fmt(d) }
  if (l.includes('last month')) { const d = new Date(now); d.setMonth(d.getMonth()-1); return fmt(d) }
  const m = l.match(/(\d+)\s*(day|week|month)s?\s*ago/)
  if (m) {
    const n = parseInt(m[1]), d = new Date(now)
    if (m[2]==='day') d.setDate(d.getDate()-n)
    if (m[2]==='week') d.setDate(d.getDate()-n*7)
    if (m[2]==='month') d.setMonth(d.getMonth()-n)
    return fmt(d)
  }
  return undefined
}

import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

// ─── UI FUNCTION DECLARATIONS ─────────────────────────────────────────────────
const uiFunctions = [
  {
    name: 'navigate_to',
    description: 'Navigate to a different view in the mail app (inbox, sent, compose, etc.)',
    parameters: {
      type: 'object',
      properties: {
        view: {
          type: 'string',
          enum: ['inbox', 'sent', 'drafts', 'starred', 'compose'],
          description: 'The view to navigate to',
        },
      },
      required: ['view'],
    },
  },
  {
    name: 'compose_email',
    description: 'Open the compose view and optionally pre-fill To, Subject, and Body fields.',
    parameters: {
      type: 'object',
      properties: {
        to:      { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject line' },
        body:    { type: 'string', description: 'Email body text' },
      },
    },
  },
  {
    name: 'search_emails',
    description: 'Search and filter emails in the inbox by query, sender, date range, or read status.',
    parameters: {
      type: 'object',
      properties: {
        query:      { type: 'string',  description: 'Search query (keyword, subject, etc.)' },
        sender:     { type: 'string',  description: 'Filter by sender name or email' },
        dateFrom:   { type: 'string',  description: 'Start date filter (e.g. "7 days ago", "last week")' },
        dateTo:     { type: 'string',  description: 'End date filter' },
        unreadOnly: { type: 'boolean', description: 'Show only unread emails' },
      },
    },
  },
  {
    name: 'open_email',
    description: 'Open and display a specific email by its ID.',
    parameters: {
      type: 'object',
      properties: {
        emailId: { type: 'string', description: 'The ID of the email to open' },
      },
      required: ['emailId'],
    },
  },
  {
    name: 'send_email',
    description: 'Send an email. Always asks for user confirmation before sending.',
    parameters: {
      type: 'object',
      properties: {
        to:      { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject' },
        body:    { type: 'string', description: 'Email body text' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'reply_to_current',
    description: 'Reply to the currently open email.',
    parameters: {
      type: 'object',
      properties: {
        body: { type: 'string', description: 'Reply text' },
      },
    },
  },
  {
    name: 'get_email_info',
    description: 'Get information about emails currently visible or the open email.',
    parameters: {
      type: 'object',
      properties: {
        infoType: {
          type: 'string',
          enum: ['list_visible', 'current_open', 'count_unread'],
          description: 'What information to retrieve',
        },
      },
      required: ['infoType'],
    },
  },
]

// ─── SYSTEM PROMPT ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Aether, an intelligent AI email assistant embedded in a beautiful mail client app. You can control the UI by calling functions.

KEY BEHAVIORS:
1. When user asks to "send an email to X", call compose_email to fill the form.
2. When user asks to "show emails from last week", call search_emails with date filters.
3. When user asks to "show unread emails", call search_emails with unreadOnly: true.
4. When user asks to "go to inbox/sent/compose", call navigate_to.
5. ALWAYS confirm before sending. Never send without explicit user approval.
6. Be concise and action-oriented — call functions, don't just describe.
7. Be context-aware: you know the current view and open email.

PERSONALITY: Friendly, efficient, smart. Keep responses brief.`

// ─── TYPES ─────────────────────────────────────────────────────────────────────
export interface AIContext {
  currentView: string
  openEmailId?: string
  openEmailSubject?: string
  openEmailFrom?: string
  visibleEmails?: Array<{ id: string; from: string; subject: string; date?: string; isRead: boolean }>
  userEmail?: string
}

export interface ChatMessage {
  role: 'user' | 'model'
  parts: Array<{ text: string }>
}

// ─── MODELS TO TRY IN ORDER ───────────────────────────────────────────────────
const MODEL_PRIORITY = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-flash-002',
]

export async function runAIChat(
  userMessage: string,
  history: ChatMessage[],
  context: AIContext
): Promise<{
  text: string
  functionCalls: Array<{ name: string; args: Record<string, unknown> }>
}> {
  const systemInstruction = SYSTEM_PROMPT +
    `\n\nCURRENT CONTEXT:\n- View: ${context.currentView}\n- User: ${context.userEmail || 'unknown'}\n- Open email: ${context.openEmailSubject ? `"${context.openEmailSubject}" from ${context.openEmailFrom}` : 'none'}\n- Visible emails (${context.visibleEmails?.length || 0}): ${JSON.stringify(context.visibleEmails?.slice(0, 5) || [])}`

  let lastError: Error | null = null

  for (const modelName of MODEL_PRIORITY) {
    try {
      // Build contents array from history + new message
      const contents = [
        ...history.map(h => ({
          role: h.role,
          parts: h.parts,
        })),
        {
          role: 'user' as const,
          parts: [{ text: userMessage }],
        },
      ]

      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: uiFunctions }],
          maxOutputTokens: 1024,
          temperature: 0.7,
        },
      })

      // Extract function calls and text
      const functionCalls: Array<{ name: string; args: Record<string, unknown> }> = []
      let text = ''

      const candidates = response.candidates || []
      for (const candidate of candidates) {
        for (const part of candidate.content?.parts || []) {
          if (part.functionCall) {
            functionCalls.push({
              name: part.functionCall.name || '',
              args: (part.functionCall.args || {}) as Record<string, unknown>,
            })
          } else if (part.text) {
            text += part.text
          }
        }
      }

      // Fallback: try response.text
      if (!text) {
        try { text = response.text || '' } catch {}
      }

      console.log(`✅ Gemini model used: ${modelName}`)
      return { text, functionCalls }

    } catch (err: any) {
      lastError = err
      const msg = err?.message || ''
      const isModelError = msg.includes('not found') || msg.includes('404') ||
        msg.includes('not supported') || msg.includes('INVALID_ARGUMENT')

      if (!isModelError) {
        console.error(`❌ Gemini fatal error with ${modelName}:`, msg)
        throw err
      }
      console.warn(`⚠️ Model ${modelName} unavailable, trying next...`)
    }
  }

  throw lastError || new Error('All Gemini models failed')
}

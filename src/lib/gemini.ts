import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// ─── UI FUNCTION DECLARATIONS ─────────────────────────────────────────────────
// These are the functions the AI can call to control the UI

const uiFunctions: FunctionDeclaration[] = [
  {
    name: 'navigate_to',
    description: 'Navigate to a different view in the mail app (inbox, sent, compose, etc.)',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        view: {
          type: SchemaType.STRING,
          enum: ['inbox', 'sent', 'drafts', 'starred', 'compose'],
          description: 'The view to navigate to',
        },
      },
      required: ['view'],
    },
  },
  {
    name: 'compose_email',
    description: 'Open the compose view and optionally pre-fill To, Subject, and Body fields. Fields are animated visibly as they fill.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        to: { type: SchemaType.STRING, description: 'Recipient email address' },
        subject: { type: SchemaType.STRING, description: 'Email subject line' },
        body: { type: SchemaType.STRING, description: 'Email body text' },
      },
    },
  },
  {
    name: 'search_emails',
    description: 'Search and filter emails in the inbox by query, sender, date range, or read status. Updates the email list visibly.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: { type: SchemaType.STRING, description: 'Search query (keyword, subject, etc.)' },
        sender: { type: SchemaType.STRING, description: 'Filter by sender name or email' },
        dateFrom: { type: SchemaType.STRING, description: 'Start date filter (ISO format or relative like "7 days ago")' },
        dateTo: { type: SchemaType.STRING, description: 'End date filter' },
        unreadOnly: { type: SchemaType.BOOLEAN, description: 'Show only unread emails' },
      },
    },
  },
  {
    name: 'open_email',
    description: 'Open and display a specific email by its ID. Shows the full email content.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        emailId: { type: SchemaType.STRING, description: 'The ID of the email to open' },
      },
      required: ['emailId'],
    },
  },
  {
    name: 'send_email',
    description: 'Send an email. Always asks for user confirmation before sending (human-in-the-loop).',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        to: { type: SchemaType.STRING, description: 'Recipient email address' },
        subject: { type: SchemaType.STRING, description: 'Email subject' },
        body: { type: SchemaType.STRING, description: 'Email body text' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'reply_to_current',
    description: 'Reply to the currently open email. Fills in reply fields automatically.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        body: { type: SchemaType.STRING, description: 'Reply text' },
      },
    },
  },
  {
    name: 'get_email_info',
    description: 'Get information about emails currently visible or the open email. Use to answer questions about emails.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        infoType: {
          type: SchemaType.STRING,
          enum: ['list_visible', 'current_open', 'count_unread'],
          description: 'What information to retrieve',
        },
      },
      required: ['infoType'],
    },
  },
]

// ─── SYSTEM PROMPT ─────────────────────────────────────────────────────────────

export const SYSTEM_PROMPT = `You are Aether, an intelligent AI email assistant embedded in a beautiful mail client app. You can control the UI by calling functions — you are NOT just a chatbot.

KEY BEHAVIORS:
1. When a user says "send an email to X with subject Y", call compose_email to visibly fill the form, then send_email to trigger confirmation.
2. When a user says "show me emails from last week", call search_emails with appropriate date filters.
3. When a user says "open the latest email from X", call get_email_info first, then open_email with the ID.
4. When a user says "go to inbox/sent/compose", call navigate_to.
5. ALWAYS ask for confirmation before sending. Never send without explicit user approval.
6. Be concise and action-oriented. Don't just describe what you'll do — DO it by calling functions.
7. Be context-aware: you know the current view and open email.
8. You can parse natural language dates: "last week", "yesterday", "10 days ago", etc.

PERSONALITY:
- Friendly, efficient, and smart
- Proactively helps with email tasks
- Confirms important actions (sending, deleting)
- Uses the user's name when known
- Keeps responses brief but helpful`

// ─── MAIN AI FUNCTION ─────────────────────────────────────────────────────────

export interface AIContext {
  currentView: string
  openEmailId?: string
  openEmailSubject?: string
  openEmailFrom?: string
  visibleEmails?: Array<{ id: string; from: string; subject: string; date: string; isRead: boolean }>
  userEmail?: string
}

export interface ChatMessage {
  role: 'user' | 'model'
  parts: Array<{ text: string }>
}

export async function runAIChat(
  userMessage: string,
  history: ChatMessage[],
  context: AIContext
): Promise<{
  text: string
  functionCalls: Array<{ name: string; args: Record<string, unknown> }>
}> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: SYSTEM_PROMPT + `\n\nCURRENT CONTEXT:\n- View: ${context.currentView}\n- User: ${context.userEmail || 'unknown'}\n- Open email: ${context.openEmailSubject ? `"${context.openEmailSubject}" from ${context.openEmailFrom}` : 'none'}\n- Visible emails: ${context.visibleEmails?.length || 0} emails shown`,
    tools: [{ functionDeclarations: uiFunctions }],
    generationConfig: { maxOutputTokens: 1024 },
  })

  const chat = model.startChat({ history })
  const result = await chat.sendMessage(userMessage)
  const response = result.response

  const functionCalls: Array<{ name: string; args: Record<string, unknown> }> = []
  for (const candidate of response.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      if (part.functionCall) {
        functionCalls.push({
          name: part.functionCall.name,
          args: part.functionCall.args as Record<string, unknown>,
        })
      }
    }
  }

  return {
    text: response.text() || '',
    functionCalls,
  }
}

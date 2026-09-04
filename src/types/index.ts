// Types shared across the app

export interface Email {
  id: string
  threadId: string
  from: string
  fromName: string
  fromEmail: string
  to: string
  subject: string
  snippet: string
  body: string
  bodyHtml?: string
  date: string
  dateRaw: number
  isRead: boolean
  isStarred: boolean
  labels: string[]
}

export interface EmailThread {
  id: string
  emails: Email[]
  subject: string
  participants: string[]
  lastDate: string
  isRead: boolean
}

export type MailView = 'inbox' | 'sent' | 'drafts' | 'starred' | 'compose' | 'detail'

export interface ComposeData {
  to: string
  subject: string
  body: string
  cc?: string
  bcc?: string
}

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  action?: UIAction
  emailPreviews?: Email[]
  requiresConfirmation?: boolean
  confirmationData?: {
    type: 'send'
    to: string
    subject: string
    body: string
  }
}

export interface UIAction {
  type: 'navigate' | 'compose' | 'search' | 'open_email' | 'filter' | 'send' | 'reply' | 'info'
  description: string
  params?: Record<string, unknown>
}

export interface FilterState {
  query: string
  sender?: string
  dateFrom?: string
  dateTo?: string
  unreadOnly: boolean
  label?: string
}

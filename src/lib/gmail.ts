import { google } from 'googleapis'
import { Email } from '@/types'

export function createGmailClient(accessToken: string) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.gmail({ version: 'v1', auth })
}

function decodeBase64(encoded: string): string {
  return Buffer.from(encoded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
}

function extractBody(payload: any): { text: string; html: string } {
  let text = ''
  let html = ''

  function traverse(part: any) {
    if (!part) return
    if (part.mimeType === 'text/plain' && part.body?.data) {
      text = decodeBase64(part.body.data)
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      html = decodeBase64(part.body.data)
    }
    if (part.parts) part.parts.forEach(traverse)
  }

  traverse(payload)
  return { text, html }
}

function parseEmail(raw: any): Email {
  const headers: Record<string, string> = {}
  ;(raw.payload?.headers || []).forEach((h: any) => {
    headers[h.name.toLowerCase()] = h.value
  })

  const from = headers['from'] || ''
  const fromMatch = from.match(/^"?([^"<]+)"?\s*<?([^>]*)>?$/)
  const fromName = fromMatch?.[1]?.trim() || from.split('@')[0] || 'Unknown'
  const fromEmail = fromMatch?.[2]?.trim() || from

  const { text, html } = extractBody(raw.payload)
  const dateStr = headers['date'] || ''
  const dateObj = new Date(dateStr)

  return {
    id: raw.id,
    threadId: raw.threadId,
    from: from,
    fromName: fromName,
    fromEmail: fromEmail,
    to: headers['to'] || '',
    subject: headers['subject'] || '(no subject)',
    snippet: raw.snippet || '',
    body: text || html.replace(/<[^>]+>/g, '') || raw.snippet || '',
    bodyHtml: html || undefined,
    date: formatDate(dateObj),
    dateRaw: dateObj.getTime(),
    isRead: !(raw.labelIds || []).includes('UNREAD'),
    isStarred: (raw.labelIds || []).includes('STARRED'),
    labels: raw.labelIds || [],
  }
}

function formatDate(date: Date): string {
  if (isNaN(date.getTime())) return 'Unknown'
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / 86400000)

  if (days === 0) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  if (days === 1) return 'Yesterday'
  if (days < 7) return date.toLocaleDateString('en-US', { weekday: 'short' })
  if (days < 365) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export async function listEmails(
  accessToken: string,
  options: {
    label?: string
    query?: string
    maxResults?: number
    pageToken?: string
  } = {}
): Promise<{ emails: Email[]; nextPageToken?: string }> {
  const gmail = createGmailClient(accessToken)

  const q = options.query || ''
  const label = options.label || 'INBOX'

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    labelIds: [label],
    q: q || undefined,
    maxResults: options.maxResults || 30,
    pageToken: options.pageToken,
  })

  const messages = listRes.data.messages || []
  if (messages.length === 0) return { emails: [] }

  const emailPromises = messages.map(msg =>
    gmail.users.messages.get({
      userId: 'me',
      id: msg.id!,
      format: 'full',
    }).then(res => parseEmail(res.data))
  )

  const emails = await Promise.all(emailPromises)
  return {
    emails,
    nextPageToken: listRes.data.nextPageToken || undefined,
  }
}

export async function getEmail(accessToken: string, id: string): Promise<Email> {
  const gmail = createGmailClient(accessToken)
  const res = await gmail.users.messages.get({
    userId: 'me',
    id,
    format: 'full',
  })
  return parseEmail(res.data)
}

export async function sendEmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  replyToMessageId?: string
): Promise<string> {
  const gmail = createGmailClient(accessToken)

  const headers = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
  ]

  if (replyToMessageId) {
    headers.push(`In-Reply-To: ${replyToMessageId}`)
    headers.push(`References: ${replyToMessageId}`)
  }

  const rawEmail = headers.join('\r\n') + '\r\n\r\n' + body
  const encoded = Buffer.from(rawEmail).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encoded },
  })

  return res.data.id || ''
}

export async function markAsRead(accessToken: string, id: string): Promise<void> {
  const gmail = createGmailClient(accessToken)
  await gmail.users.messages.modify({
    userId: 'me',
    id,
    requestBody: { removeLabelIds: ['UNREAD'] },
  })
}

export async function getUnreadCount(accessToken: string): Promise<number> {
  const gmail = createGmailClient(accessToken)
  const res = await gmail.users.labels.get({ userId: 'me', id: 'INBOX' })
  return res.data.messagesUnread || 0
}

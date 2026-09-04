import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { listEmails, getEmail, sendEmail, markAsRead, getUnreadCount } from '@/lib/gmail'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  try {
    switch (action) {
      case 'list': {
        const label = searchParams.get('label') || 'INBOX'
        const query = searchParams.get('q') || ''
        const maxResults = parseInt(searchParams.get('limit') || '30')
        const result = await listEmails(session.accessToken, { label, query, maxResults })
        return NextResponse.json(result)
      }

      case 'get': {
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
        const email = await getEmail(session.accessToken, id)
        return NextResponse.json(email)
      }

      case 'unread_count': {
        const count = await getUnreadCount(session.accessToken)
        return NextResponse.json({ count })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Gmail API error:', error)
    return NextResponse.json({ error: error.message || 'Gmail API error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'send': {
        const { to, subject, emailBody, replyToId } = body
        if (!to || !subject || !emailBody) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }
        const messageId = await sendEmail(session.accessToken, to, subject, emailBody, replyToId)
        return NextResponse.json({ success: true, messageId })
      }

      case 'mark_read': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
        await markAsRead(session.accessToken, id)
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Gmail API error:', error)
    return NextResponse.json({ error: error.message || 'Gmail API error' }, { status: 500 })
  }
}

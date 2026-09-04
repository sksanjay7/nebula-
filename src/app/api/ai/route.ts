import { NextRequest, NextResponse } from 'next/server'
import { runAIChat, ChatMessage, AIContext } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, history, context } = body as {
      message: string
      history: ChatMessage[]
      context: AIContext
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Empty message' }, { status: 400 })
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      return NextResponse.json({
        text: "⚠️ Gemini API key not configured. Please add your GEMINI_API_KEY to the .env.local file. Get a free key at https://aistudio.google.com/app/apikey",
        functionCalls: [],
      })
    }

    const result = await runAIChat(message, history || [], context || { currentView: 'inbox' })
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('AI route error:', error)
    return NextResponse.json(
      { error: error.message || 'AI error', text: 'Sorry, I encountered an error. Please try again.', functionCalls: [] },
      { status: 500 }
    )
  }
}

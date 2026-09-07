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
    console.error('AI route error full:', JSON.stringify(error, null, 2))
    console.error('AI route error message:', error?.message)
    console.error('AI route error status:', error?.status)

    // Specific Gemini API error messages
    let userMsg = 'Sorry, I encountered an error. Please try again.'
    if (error?.message?.includes('API_KEY_INVALID') || error?.message?.includes('API key')) {
      userMsg = '⚠️ Your Gemini API key is invalid. Please check your .env.local file and make sure GEMINI_API_KEY is correct.'
    } else if (error?.message?.includes('quota') || error?.message?.includes('QUOTA')) {
      userMsg = '⚠️ Gemini API quota exceeded. Please wait a moment and try again.'
    } else if (error?.message?.includes('PERMISSION_DENIED')) {
      userMsg = '⚠️ Permission denied. Make sure your Gemini API key has access to the Gemini API.'
    }

    return NextResponse.json(
      { error: error.message || 'AI error', text: userMsg, functionCalls: [] },
      { status: 500 }
    )
  }
}

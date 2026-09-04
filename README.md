# Aether Mail — AI-Powered Email Client

> A beautiful mail client where the AI assistant **controls the UI** — not just a chatbot.

## ✨ Features

- **AI-Driven UI**: Say "send an email to X" — the compose form visibly fills up
- **Natural Language Search**: "Show emails from last week", "Find emails from John"
- **Real Gmail Integration**: OAuth 2.0 with Gmail API
- **Real-Time Sync**: New emails appear without manual refresh (30s polling)
- **Context-Aware AI**: Knows your current view and open email
- **Human-in-the-Loop**: AI always asks before sending emails
- **Dark/Light Mode**: Beautiful glassmorphism design
- **Thread-Aware**: Full email rendering including HTML

---

## 🚀 Setup

### Step 1: Get a Gemini API Key (Free)

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **"Create API Key"**
3. Copy the key

### Step 2: Set up Google OAuth for Gmail

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Go to **APIs & Services → Library**
4. Search for **"Gmail API"** and click **Enable**
5. Go to **APIs & Services → OAuth consent screen**
   - Set User Type to **"External"**
   - Fill in app name: `Aether Mail`
   - Add your email as a test user
6. Go to **APIs & Services → Credentials**
7. Click **Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
8. Copy **Client ID** and **Client Secret**

### Step 3: Configure Environment Variables

Edit `.env.local` in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
NEXTAUTH_SECRET=any-long-random-string-here
NEXTAUTH_URL=http://localhost:3000
```

For `NEXTAUTH_SECRET`, you can generate one with:
```bash
openssl rand -base64 32
```
Or just use any long random string.

### Step 4: Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with Google.

---

## 🤖 How to Use the AI Assistant

The AI panel is on the **right sidebar**. Type commands in natural language:

| What you say | What happens |
|---|---|
| "Send an email to alice@example.com about the meeting tomorrow" | Compose form opens and visibly fills with animated typing |
| "Show emails from last week" | Inbox filters to last 7 days |
| "Find emails from John" | Searches for emails from John |
| "Open the latest email" | Opens the first email in the list |
| "Reply to this email saying I'll be there at 3pm" | Reply fills in with that text |
| "Show only unread emails" | Filters inbox to unread |
| "Go to sent" | Navigates to sent view |

The AI will always **ask for confirmation** before sending. You'll see a ✓/✕ button in the chat.

---

## 🏗️ Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts  ← OAuth handler
│   │   ├── gmail/route.ts               ← Gmail proxy (keeps tokens server-side)
│   │   └── ai/route.ts                  ← Gemini AI endpoint
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── MailApp.tsx        ← Main orchestrator, registers UI controller
│   ├── AppHeader.tsx      ← Header with search
│   ├── Sidebar.tsx        ← Navigation
│   ├── EmailList.tsx      ← Email list with skeletons
│   ├── EmailDetail.tsx    ← Full email reader
│   ├── ComposeView.tsx    ← Compose form (AI fills this)
│   └── AIPanel.tsx        ← AI chat + function execution
├── context/
│   ├── MailContext.tsx         ← Global mail state
│   ├── UIControllerContext.tsx ← Bridge between AI and UI
│   └── ToastContext.tsx        ← Notifications
├── lib/
│   ├── gmail.ts    ← Gmail API client
│   └── gemini.ts   ← Gemini + function calling definitions
└── types/index.ts  ← Shared TypeScript types
```

### Key Design: UI Controller Pattern

The `UIControllerContext` acts as an **event bus** between the AI and the React components:

1. `MailApp` **registers** action handlers (navigate, compose, search, openEmail)
2. `AIPanel` calls Gemini with function calling enabled
3. Gemini returns function call results
4. `AIPanel` calls `execute(actionName, ...args)` on the UIController
5. The registered handler in `MailApp` fires, updating React state visibly

This keeps AI logic and UI logic cleanly separated.

---

## 🎨 Tech Stack

- **Next.js 14** (App Router, TypeScript)
- **Google Gemini 1.5 Flash** (Function Calling)
- **Gmail API** via OAuth 2.0
- **NextAuth.js** for authentication
- **Framer Motion** for animations
- **Vanilla CSS** — no Tailwind

---

## 🔧 What I'd Improve with More Time

1. **Gmail Push Notifications** via Pub/Sub (replace polling)
2. **Draft auto-save** while composing
3. **Thread view** — group related emails
4. **Rich text editor** in compose
5. **Email labels** management
6. **Offline support** with service workers
7. **Deployed live demo** on Vercel

---

## 📸 Screenshots

Sign in → Gmail OAuth → Beautiful dark inbox → AI sidebar

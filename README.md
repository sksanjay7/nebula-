Aether Mail ✉️🤖
Aether Mail is a modern, AI-powered email client built with Next.js and the Gmail API. It features a stunning glassmorphism UI with smooth animations and integrates Google's Gemini AI to act as your personal inbox assistant.

With Aether Mail, you can navigate your inbox, search for emails using natural language, and compose messages just by talking to the AI—no clicking required!

✨ Features
🤖 AI-Controlled UI: Ask the Gemini AI assistant to "send an email to John" or "show me unread emails," and watch the UI respond dynamically.
🔍 Natural Language Search: Find emails easily without needing complex search operators.
⚡ Real-Time Sync: Automatically polls and syncs with your Gmail inbox.
🔒 Privacy First: Uses Google OAuth for secure access. Your emails are never stored on our servers; they are only processed by the app and Gemini AI.
🎨 Premium Aesthetic: Beautiful dark mode interface featuring aurora backgrounds, glassmorphism, and spring-based animations.
🛠️ Tech Stack
Framework: Next.js 14 (React)
Authentication: NextAuth.js (Google Provider)
Email Integration: Gmail API
AI Integration: Google Gemini API (@google/genai SDK)
Styling: Vanilla CSS with modern tokens and animations
🚀 Getting Started
To run this project locally, you will need a Google Cloud Project with the Gmail API enabled, and a Gemini API Key.

Prerequisites
Google Cloud Console:
Create a project and enable the Gmail API.
Configure the OAuth consent screen.
Create OAuth 2.0 Client IDs (Web application) and get your Client ID and Client Secret.
Add http://localhost:3000 to Authorized JavaScript origins.
Add http://localhost:3000/api/auth/callback/google to Authorized redirect URIs.
Google AI Studio:
Get a Gemini API Key.
Installation
Clone the repository:

bash

git clone https://github.com/sksanjay7/nebula-.git
cd nebula-
Install dependencies:

bash

npm install
Create a .env.local file in the root directory and add your credentials:

env

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_super_secret_string
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GEMINI_API_KEY=your_gemini_api_key
Start the development server:

bash

npm run dev
Open http://localhost:3000 in your browser.

📬 Contact & Testing Note from the Developer
Hello! I have set up a test email for this project: 
sanjay.2306040@srec.ac.in
.

If you need to test the user experience or interact with the app, please feel free to email me there. This is my first time working and connecting with the Gmail API, and I am eager to learn from my mistakes.

If you find any issues, have feedback, or just want to connect, please do not hesitate to contact me at that email address. I would really appreciate the opportunity to improve!

Built with ❤️ and AI.

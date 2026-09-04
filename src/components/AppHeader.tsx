'use client'
import { useSession, signOut } from 'next-auth/react'
import { useMail } from '@/context/MailContext'
import { useRef, useState } from 'react'

export function AppHeader() {
  const { data: session } = useSession()
  const { state, setView, setFilter, setEmails, setLoading } = useMail()
  const [searchValue, setSearchValue] = useState('')
  const [isDark, setIsDark] = useState(true)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  const handleSearch = (value: string) => {
    setSearchValue(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setView('inbox')
      if (!value.trim()) {
        setFilter({ query: '' })
        const res = await fetch('/api/gmail?action=list&label=INBOX')
        if (res.ok) {
          const { emails } = await res.json()
          setEmails(emails || [])
        }
        return
      }
      setLoading(true)
      setFilter({ query: value })
      const res = await fetch(`/api/gmail?action=list&label=INBOX&q=${encodeURIComponent(value)}`)
      if (res.ok) {
        const { emails } = await res.json()
        setEmails(emails || [])
      }
      setLoading(false)
    }, 600)
  }

  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark')
  }

  const userInitial = session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || 'U'

  return (
    <header className="app-header">
      <div className="logo">
        <div className="logo-icon">✉️</div>
        <span>Aether Mail</span>
      </div>

      <div className="header-search">
        <span className="search-icon">🔍</span>
        <input
          id="header-search-input"
          type="text"
          placeholder="Search emails... or ask the AI assistant"
          value={searchValue}
          onChange={e => handleSearch(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
        <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
          {isDark ? '☀️' : '🌙'}
        </button>

        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            position: 'relative',
          }}
          onClick={() => signOut()}
          title={`Sign out (${session?.user?.email})`}
        >
          {session?.user?.image ? (
            <img src={session.user.image} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : userInitial}
        </div>
      </div>
    </header>
  )
}

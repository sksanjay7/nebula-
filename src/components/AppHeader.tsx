'use client'
import { useSession, signOut } from 'next-auth/react'
import { useMail } from '@/context/MailContext'
import { useRef, useState } from 'react'

export function AppHeader() {
  const { data: session } = useSession()
  const { state, setView, setFilter, setEmails, setLoading } = useMail()
  const [searchValue, setSearchValue] = useState('')
  const [isDark, setIsDark] = useState(true)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  const handleSearch = (value: string) => {
    setSearchValue(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setView('inbox')
      if (!value.trim()) {
        setFilter({ query: '' })
        const res = await fetch('/api/gmail?action=list&label=INBOX')
        if (res.ok) { const { emails } = await res.json(); setEmails(emails || []) }
        return
      }
      setLoading(true)
      setFilter({ query: value })
      const res = await fetch(`/api/gmail?action=list&label=INBOX&q=${encodeURIComponent(value)}`)
      if (res.ok) { const { emails } = await res.json(); setEmails(emails || []) }
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
      {/* Logo */}
      <div className="logo">
        <div className="logo-icon">✉️</div>
        <span className="logo-text">Aether Mail</span>
      </div>

      {/* Search */}
      <div className="header-search">
        <span className="search-icon">🔍</span>
        <input
          id="header-search-input"
          type="text"
          placeholder="Search emails or ask the AI..."
          value={searchValue}
          onChange={e => handleSearch(e.target.value)}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
        <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
          {isDark ? '☀️' : '🌙'}
        </button>

        {/* User Avatar */}
        <div style={{ position: 'relative' }}>
          <button
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 800, fontSize: '0.85rem',
              cursor: 'pointer', transition: 'all var(--t-spring)',
              border: '2px solid rgba(99,102,241,0.3)',
              overflow: 'hidden',
            }}
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px var(--glow-primary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
            title={session?.user?.email || ''}
          >
            {session?.user?.image
              ? <img src={session.user.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : userInitial}
          </button>

          {userMenuOpen && (
            <div style={{
              position: 'absolute', top: '110%', right: 0, zIndex: 200,
              background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--r-lg)', padding: '6px',
              boxShadow: 'var(--shadow-lg)', minWidth: 190,
              animation: 'msgReveal 0.25s var(--t-spring)',
            }}>
              <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid var(--border-dim)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                  {session?.user?.name || 'User'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {session?.user?.email}
                </div>
              </div>
              <button
                onClick={() => signOut()}
                style={{
                  width: '100%', padding: '9px 12px', marginTop: 4,
                  borderRadius: 'var(--r-md)', background: 'transparent',
                  color: 'var(--accent-danger)', fontSize: '0.82rem',
                  fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                  transition: 'background var(--t-fast)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                🚪 Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

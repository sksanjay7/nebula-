'use client'
import { useMail } from '@/context/MailContext'
import { MailView } from '@/types'

const navItems = [
  { id: 'inbox',   icon: '📥', label: 'Inbox',   showBadge: true },
  { id: 'sent',    icon: '📤', label: 'Sent' },
  { id: 'starred', icon: '⭐', label: 'Starred' },
  { id: 'drafts',  icon: '📝', label: 'Drafts' },
]

const labels = [
  { name: 'Work',     color: '#6366f1' },
  { name: 'Personal', color: '#10b981' },
  { name: 'Finance',  color: '#f59e0b' },
  { name: 'Travel',   color: '#06b6d4' },
]

export function Sidebar() {
  const { state, setView, resetCompose } = useMail()

  const handleCompose = () => {
    resetCompose()
    setView('compose')
  }

  const handleNav = (view: string) => {
    setView(view as MailView)
  }

  return (
    <>
      <button
        id="compose-btn"
        className="compose-btn"
        onClick={handleCompose}
      >
        <span style={{ fontSize: 16 }}>✏️</span>
        Compose
      </button>

      <div className="nav-divider" />
      <div className="nav-label">Mailboxes</div>

      {navItems.map(item => (
        <button
          key={item.id}
          id={`nav-${item.id}`}
          className={`nav-item ${
            state.view === item.id ||
            (state.view === 'detail' && item.id === 'inbox')
              ? 'active'
              : ''
          }`}
          onClick={() => handleNav(item.id)}
        >
          <span className="nav-icon">{item.icon}</span>
          {item.label}
          {item.showBadge && state.totalUnread > 0 && (
            <span className="nav-badge">
              {state.totalUnread > 99 ? '99+' : state.totalUnread}
            </span>
          )}
        </button>
      ))}

      <div className="nav-divider" />
      <div className="nav-label">Labels</div>

      {labels.map(label => (
        <button key={label.name} className="nav-item">
          <span
            className="nav-icon"
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: label.color,
              display: 'inline-block',
              boxShadow: `0 0 8px ${label.color}80`,
              flexShrink: 0,
            }}
          />
          {label.name}
        </button>
      ))}

      {/* Storage indicator at bottom */}
      <div style={{ marginTop: 'auto', padding: '8px 8px 4px' }}>
        <div style={{
          fontSize: '0.7rem', color: 'var(--text-secondary)',
          marginBottom: 5, opacity: 0.7,
        }}>
          Storage
        </div>
        <div style={{
          height: 4, background: 'var(--border-dim)',
          borderRadius: 'var(--r-full)', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: '34%',
            background: 'var(--grad-primary)',
            borderRadius: 'var(--r-full)',
            boxShadow: '0 0 8px var(--glow-primary)',
            transition: 'width 1s ease',
          }} />
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: 3, opacity: 0.6 }}>
          5.1 GB of 15 GB
        </div>
      </div>
    </>
  )
}

'use client'
import { useMail } from '@/context/MailContext'
import { MailView } from '@/types'

const navItems = [
  { id: 'inbox', icon: '📥', label: 'Inbox', showBadge: true },
  { id: 'sent', icon: '📤', label: 'Sent' },
  { id: 'starred', icon: '⭐', label: 'Starred' },
  { id: 'drafts', icon: '📝', label: 'Drafts' },
]

const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6']

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

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
        <span>✏️</span>
        Compose
      </button>

      <div className="divider" />

      <div className="nav-label">Mailboxes</div>

      {navItems.map(item => (
        <button
          key={item.id}
          id={`nav-${item.id}`}
          className={`nav-item ${state.view === item.id || (state.view === 'detail' && item.id === 'inbox') ? 'active' : ''}`}
          onClick={() => handleNav(item.id)}
        >
          <span className="nav-icon">{item.icon}</span>
          {item.label}
          {item.showBadge && state.totalUnread > 0 && (
            <span className="nav-badge">{state.totalUnread > 99 ? '99+' : state.totalUnread}</span>
          )}
        </button>
      ))}

      <div className="divider" />
      <div className="nav-label">Labels</div>

      {['Work', 'Personal', 'Finance', 'Travel'].map(label => (
        <button
          key={label}
          className="nav-item"
          onClick={() => {/* TODO: filter by label */}}
        >
          <span
            className="nav-icon"
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: getAvatarColor(label),
              display: 'inline-block',
              marginRight: 2,
            }}
          />
          {label}
        </button>
      ))}
    </>
  )
}

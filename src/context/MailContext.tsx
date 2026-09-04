'use client'
import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react'
import { Email, MailView, ComposeData, FilterState } from '@/types'

interface MailState {
  view: MailView
  emails: Email[]
  sentEmails: Email[]
  selectedEmail: Email | null
  compose: ComposeData
  filter: FilterState
  isLoading: boolean
  totalUnread: number
  lastRefresh: number
}

type MailAction =
  | { type: 'SET_VIEW'; payload: MailView }
  | { type: 'SET_EMAILS'; payload: Email[] }
  | { type: 'SET_SENT'; payload: Email[] }
  | { type: 'SELECT_EMAIL'; payload: Email | null }
  | { type: 'SET_COMPOSE'; payload: Partial<ComposeData> }
  | { type: 'SET_FILTER'; payload: Partial<FilterState> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'MARK_READ'; payload: string }
  | { type: 'SET_UNREAD_COUNT'; payload: number }
  | { type: 'REFRESH' }
  | { type: 'RESET_COMPOSE' }

const initialCompose: ComposeData = { to: '', subject: '', body: '', cc: '', bcc: '' }

const initialFilter: FilterState = { query: '', unreadOnly: false }

const initialState: MailState = {
  view: 'inbox',
  emails: [],
  sentEmails: [],
  selectedEmail: null,
  compose: initialCompose,
  filter: initialFilter,
  isLoading: false,
  totalUnread: 0,
  lastRefresh: 0,
}

function mailReducer(state: MailState, action: MailAction): MailState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, view: action.payload, selectedEmail: action.payload !== 'detail' ? state.selectedEmail : state.selectedEmail }
    case 'SET_EMAILS':
      return { ...state, emails: action.payload }
    case 'SET_SENT':
      return { ...state, sentEmails: action.payload }
    case 'SELECT_EMAIL':
      return { ...state, selectedEmail: action.payload, view: action.payload ? 'detail' : state.view }
    case 'SET_COMPOSE':
      return { ...state, compose: { ...state.compose, ...action.payload } }
    case 'RESET_COMPOSE':
      return { ...state, compose: initialCompose }
    case 'SET_FILTER':
      return { ...state, filter: { ...state.filter, ...action.payload } }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'MARK_READ':
      return {
        ...state,
        emails: state.emails.map(e => e.id === action.payload ? { ...e, isRead: true } : e),
        totalUnread: Math.max(0, state.totalUnread - 1),
      }
    case 'SET_UNREAD_COUNT':
      return { ...state, totalUnread: action.payload }
    case 'REFRESH':
      return { ...state, lastRefresh: Date.now() }
    default:
      return state
  }
}

interface MailContextValue {
  state: MailState
  setView: (view: MailView) => void
  setEmails: (emails: Email[]) => void
  setSentEmails: (emails: Email[]) => void
  selectEmail: (email: Email | null) => void
  updateCompose: (data: Partial<ComposeData>) => void
  resetCompose: () => void
  setFilter: (filter: Partial<FilterState>) => void
  setLoading: (loading: boolean) => void
  markRead: (id: string) => void
  setUnreadCount: (n: number) => void
  refresh: () => void
}

const MailContext = createContext<MailContextValue | null>(null)

export function MailProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(mailReducer, initialState)

  const setView = useCallback((view: MailView) => dispatch({ type: 'SET_VIEW', payload: view }), [])
  const setEmails = useCallback((emails: Email[]) => dispatch({ type: 'SET_EMAILS', payload: emails }), [])
  const setSentEmails = useCallback((emails: Email[]) => dispatch({ type: 'SET_SENT', payload: emails }), [])
  const selectEmail = useCallback((email: Email | null) => dispatch({ type: 'SELECT_EMAIL', payload: email }), [])
  const updateCompose = useCallback((data: Partial<ComposeData>) => dispatch({ type: 'SET_COMPOSE', payload: data }), [])
  const resetCompose = useCallback(() => dispatch({ type: 'RESET_COMPOSE' }), [])
  const setFilter = useCallback((filter: Partial<FilterState>) => dispatch({ type: 'SET_FILTER', payload: filter }), [])
  const setLoading = useCallback((loading: boolean) => dispatch({ type: 'SET_LOADING', payload: loading }), [])
  const markRead = useCallback((id: string) => dispatch({ type: 'MARK_READ', payload: id }), [])
  const setUnreadCount = useCallback((n: number) => dispatch({ type: 'SET_UNREAD_COUNT', payload: n }), [])
  const refresh = useCallback(() => dispatch({ type: 'REFRESH' }), [])

  return (
    <MailContext.Provider value={{
      state, setView, setEmails, setSentEmails, selectEmail,
      updateCompose, resetCompose, setFilter, setLoading, markRead, setUnreadCount, refresh,
    }}>
      {children}
    </MailContext.Provider>
  )
}

export function useMail() {
  const ctx = useContext(MailContext)
  if (!ctx) throw new Error('useMail must be used within MailProvider')
  return ctx
}

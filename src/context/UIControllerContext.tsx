'use client'
import { createContext, useContext, useRef, ReactNode } from 'react'
import { MailView, ComposeData } from '@/types'

// The UI Controller is the bridge between Gemini AI and the React UI.
// AI calls these functions which trigger real UI changes.

export interface UIControllerActions {
  navigateTo: (view: MailView) => void
  composeEmail: (data: Partial<ComposeData>) => void
  searchEmails: (query: string, options?: { sender?: string; dateFrom?: string; dateTo?: string; unread?: boolean }) => void
  openEmail: (emailId: string) => void
  filterInbox: (options: { sender?: string; keyword?: string; unreadOnly?: boolean }) => void
}

interface UIControllerContextValue {
  register: (actions: UIControllerActions) => void
  execute: <K extends keyof UIControllerActions>(action: K, ...args: Parameters<UIControllerActions[K]>) => void
}

const UIControllerContext = createContext<UIControllerContextValue | null>(null)

export function UIControllerProvider({ children }: { children: ReactNode }) {
  const actionsRef = useRef<UIControllerActions | null>(null)

  const register = (actions: UIControllerActions) => {
    actionsRef.current = actions
  }

  const execute = <K extends keyof UIControllerActions>(
    action: K,
    ...args: Parameters<UIControllerActions[K]>
  ) => {
    if (!actionsRef.current) {
      console.warn('UIController: No actions registered yet')
      return
    }
    const fn = actionsRef.current[action] as (...a: unknown[]) => void
    fn(...(args as unknown[]))
  }

  return (
    <UIControllerContext.Provider value={{ register, execute }}>
      {children}
    </UIControllerContext.Provider>
  )
}

export function useUIController() {
  const ctx = useContext(UIControllerContext)
  if (!ctx) throw new Error('useUIController must be within UIControllerProvider')
  return ctx
}

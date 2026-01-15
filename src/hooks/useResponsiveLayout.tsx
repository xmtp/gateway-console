import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { useMediaQuery } from "@mantine/hooks"

// Mobile breakpoint - matches Tailwind's md: breakpoint
const MOBILE_BREAKPOINT = "(max-width: 767px)"

/**
 * Returns true when viewport is less than 768px (mobile)
 * SSR-safe: defaults to false (desktop) on first render
 */
export function useIsMobile(): boolean {
  // useMediaQuery returns undefined during SSR/initial render
  // We default to false (desktop) for SSR safety
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT, false)
  return isMobile ?? false
}

// Panel types for mobile navigation
export type ActivePanel = "conversations" | "chat" | "settings"

interface ResponsiveLayoutState {
  activePanel: ActivePanel
  selectedConversationTopic: string | null
  previousPanel: ActivePanel | null
}

interface ResponsiveLayoutContextValue extends ResponsiveLayoutState {
  isMobile: boolean
  showConversations: () => void
  showChat: (topic: string) => void
  showSettings: () => void
  goBack: () => void
}

const ResponsiveLayoutContext = createContext<ResponsiveLayoutContextValue | null>(null)

interface ResponsiveLayoutProviderProps {
  children: ReactNode
}

export function ResponsiveLayoutProvider({ children }: ResponsiveLayoutProviderProps) {
  const isMobile = useIsMobile()

  const [state, setState] = useState<ResponsiveLayoutState>({
    activePanel: "conversations",
    selectedConversationTopic: null,
    previousPanel: null,
  })

  // Navigate to conversation list
  const showConversations = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activePanel: "conversations",
      previousPanel: prev.activePanel,
    }))
  }, [])

  // Navigate to chat view with topic
  const showChat = useCallback((topic: string) => {
    setState((prev) => ({
      ...prev,
      activePanel: "chat",
      selectedConversationTopic: topic,
      previousPanel: prev.activePanel,
    }))
  }, [])

  // Navigate to settings/wallet panel
  const showSettings = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activePanel: "settings",
      previousPanel: prev.activePanel,
    }))
  }, [])

  // Return to previous panel (or conversations if no previous)
  const goBack = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activePanel: prev.previousPanel ?? "conversations",
      previousPanel: null,
    }))
  }, [])

  // Handle browser back button on mobile
  useEffect(() => {
    if (!isMobile) return

    const handlePopState = () => {
      // On back button, return to conversations if not already there
      if (state.activePanel !== "conversations") {
        goBack()
      }
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [isMobile, state.activePanel, goBack])

  // Push state when navigating away from conversations on mobile
  useEffect(() => {
    if (!isMobile) return

    if (state.activePanel !== "conversations" && state.previousPanel === "conversations") {
      window.history.pushState({ panel: state.activePanel }, "")
    }
  }, [isMobile, state.activePanel, state.previousPanel])

  const value: ResponsiveLayoutContextValue = {
    ...state,
    isMobile,
    showConversations,
    showChat,
    showSettings,
    goBack,
  }

  return (
    <ResponsiveLayoutContext.Provider value={value}>
      {children}
    </ResponsiveLayoutContext.Provider>
  )
}

/**
 * Hook to access responsive layout state and navigation functions
 * Must be used within ResponsiveLayoutProvider
 */
export function useResponsiveLayout(): ResponsiveLayoutContextValue {
  const context = useContext(ResponsiveLayoutContext)
  if (!context) {
    throw new Error("useResponsiveLayout must be used within ResponsiveLayoutProvider")
  }
  return context
}

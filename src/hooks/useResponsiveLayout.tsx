import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react"
import { useMediaQuery } from "@mantine/hooks"

// Mobile breakpoint - matches Tailwind's md: breakpoint
const MOBILE_BREAKPOINT = "(max-width: 767px)"

/**
 * Returns true when viewport is less than 768px (mobile)
 * Defaults to false (desktop) on initial render for consistency
 */
export function useIsMobile(): boolean {
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT, false, { getInitialValueInEffect: true })
  return isMobile ?? false
}

// Panel types for mobile navigation
export type ActivePanel = "conversations" | "chat" | "settings"

// History state shape for browser navigation (namespaced to avoid conflicts)
interface ResponsiveLayoutHistoryState {
  __responsiveLayout: {
    panel: ActivePanel
    topic: string | null
    depth: number
  }
}

// Internal state for tracking panel navigation
interface ResponsiveLayoutState {
  activePanel: ActivePanel
  selectedConversationTopic: string | null
}

// Public context value - does not expose internal implementation details
interface ResponsiveLayoutContextValue {
  activePanel: ActivePanel
  selectedConversationTopic: string | null
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

// Helper to get our namespaced state from history.state
function getLayoutState(historyState: unknown): ResponsiveLayoutHistoryState["__responsiveLayout"] | null {
  if (
    historyState &&
    typeof historyState === "object" &&
    "__responsiveLayout" in historyState &&
    historyState.__responsiveLayout &&
    typeof historyState.__responsiveLayout === "object"
  ) {
    return historyState.__responsiveLayout as ResponsiveLayoutHistoryState["__responsiveLayout"]
  }
  return null
}

// Helper to merge our state with existing history.state
function mergeHistoryState(panel: ActivePanel, topic: string | null, depth: number): ResponsiveLayoutHistoryState {
  const existingState = window.history.state
  return {
    ...(typeof existingState === "object" && existingState !== null ? existingState : {}),
    __responsiveLayout: { panel, topic, depth },
  }
}

export function ResponsiveLayoutProvider({ children }: ResponsiveLayoutProviderProps) {
  const isMobile = useIsMobile()
  const isInitialized = useRef(false)
  const hasSyncedMobileState = useRef(false)
  const isPopstateNavigation = useRef(false)
  const historyDepth = useRef(0)
  const lastPushedState = useRef<{ panel: ActivePanel; topic: string | null } | null>(null)

  const [state, setState] = useState<ResponsiveLayoutState>({
    activePanel: "conversations",
    selectedConversationTopic: null,
  })

  // Initialize history state on mount (mobile only)
  useEffect(() => {
    if (isInitialized.current) return
    isInitialized.current = true

    // Only manage history state on mobile
    if (!isMobile) return

    // Seed initial history state with depth 0
    const newState = mergeHistoryState(state.activePanel, state.selectedConversationTopic, 0)
    window.history.replaceState(newState, "")
    hasSyncedMobileState.current = true
    lastPushedState.current = { panel: state.activePanel, topic: state.selectedConversationTopic }
  }, [isMobile, state.activePanel, state.selectedConversationTopic])

  // Handle isMobile flipping after initial mount
  useEffect(() => {
    // Skip initial render
    if (!isInitialized.current) return

    // When transitioning to mobile for the first time after init, sync history
    if (isMobile && !hasSyncedMobileState.current) {
      const newState = mergeHistoryState(state.activePanel, state.selectedConversationTopic, 0)
      window.history.replaceState(newState, "")
      hasSyncedMobileState.current = true
      lastPushedState.current = { panel: state.activePanel, topic: state.selectedConversationTopic }
    }
  }, [isMobile, state.activePanel, state.selectedConversationTopic])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const layoutState = getLayoutState(event.state)

      if (layoutState) {
        isPopstateNavigation.current = true
        historyDepth.current = layoutState.depth
        lastPushedState.current = { panel: layoutState.panel, topic: layoutState.topic }
        setState({
          activePanel: layoutState.panel,
          selectedConversationTopic: layoutState.topic,
        })
      } else {
        // No layout state - reset to conversations
        isPopstateNavigation.current = true
        historyDepth.current = 0
        lastPushedState.current = { panel: "conversations", topic: null }
        setState({
          activePanel: "conversations",
          selectedConversationTopic: null,
        })
      }
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  // Helper to push navigation state (called from navigation functions, not effect)
  const pushNavigationState = useCallback((panel: ActivePanel, topic: string | null) => {
    // Only push history on mobile
    if (!isMobile) return

    // Skip if state hasn't materially changed
    if (lastPushedState.current?.panel === panel && lastPushedState.current?.topic === topic) {
      return
    }

    historyDepth.current += 1
    const newState = mergeHistoryState(panel, topic, historyDepth.current)
    window.history.pushState(newState, "")
    lastPushedState.current = { panel, topic }
  }, [isMobile])

  // Navigate to conversation list
  const showConversations = useCallback(() => {
    setState((prev) => {
      // No-op if already on conversations with no topic
      if (prev.activePanel === "conversations" && prev.selectedConversationTopic === null) {
        return prev
      }
      return {
        activePanel: "conversations",
        selectedConversationTopic: null,
      }
    })
    pushNavigationState("conversations", null)
  }, [pushNavigationState])

  // Navigate to chat view with topic
  const showChat = useCallback((topic: string) => {
    setState((prev) => {
      // No-op if already on this chat
      if (prev.activePanel === "chat" && prev.selectedConversationTopic === topic) {
        return prev
      }
      return {
        activePanel: "chat",
        selectedConversationTopic: topic,
      }
    })
    pushNavigationState("chat", topic)
  }, [pushNavigationState])

  // Navigate to settings/wallet panel (clears topic for clean state)
  const showSettings = useCallback(() => {
    setState((prev) => {
      // No-op if already on settings
      if (prev.activePanel === "settings") {
        return prev
      }
      return {
        activePanel: "settings",
        selectedConversationTopic: null,
      }
    })
    pushNavigationState("settings", null)
  }, [pushNavigationState])

  // Return to previous panel
  const goBack = useCallback(() => {
    if (isMobile && historyDepth.current > 0) {
      // Use browser history for proper back navigation
      window.history.back()
    } else {
      // On desktop or at root, return to conversations
      setState({
        activePanel: "conversations",
        selectedConversationTopic: null,
      })
    }
  }, [isMobile])

  const value: ResponsiveLayoutContextValue = {
    activePanel: state.activePanel,
    selectedConversationTopic: state.selectedConversationTopic,
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

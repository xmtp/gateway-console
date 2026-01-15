import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, type ReactNode } from "react"
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

// Valid panel values for runtime validation
const VALID_PANELS: readonly ActivePanel[] = ["conversations", "chat", "settings"]

function isValidPanel(value: unknown): value is ActivePanel {
  return typeof value === "string" && VALID_PANELS.includes(value as ActivePanel)
}

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

// Navigation stack entry for desktop back navigation
interface NavigationEntry {
  panel: ActivePanel
  topic: string | null
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

// Helper to get and validate our namespaced state from history.state
function getLayoutState(historyState: unknown): ResponsiveLayoutHistoryState["__responsiveLayout"] | null {
  if (
    historyState &&
    typeof historyState === "object" &&
    "__responsiveLayout" in historyState &&
    historyState.__responsiveLayout &&
    typeof historyState.__responsiveLayout === "object"
  ) {
    const layoutState = historyState.__responsiveLayout as Record<string, unknown>

    // Validate panel is a valid ActivePanel
    if (!isValidPanel(layoutState.panel)) {
      return null
    }

    // Validate depth is a finite number
    if (typeof layoutState.depth !== "number" || !Number.isFinite(layoutState.depth)) {
      return null
    }

    // Validate topic is string or null
    if (layoutState.topic !== null && typeof layoutState.topic !== "string") {
      return null
    }

    return {
      panel: layoutState.panel,
      topic: layoutState.topic as string | null,
      depth: layoutState.depth,
    }
  }
  return null
}

// Helper to merge our state with existing history.state
function mergeHistoryState(
  existingHistoryState: unknown,
  panel: ActivePanel,
  topic: string | null,
  depth: number
): ResponsiveLayoutHistoryState {
  return {
    ...(typeof existingHistoryState === "object" && existingHistoryState !== null ? existingHistoryState : {}),
    __responsiveLayout: { panel, topic, depth },
  }
}

export function ResponsiveLayoutProvider({ children }: ResponsiveLayoutProviderProps) {
  const isMobile = useIsMobile()
  const prevIsMobileRef = useRef(isMobile)
  const historyDepth = useRef(0)
  const lastPushedState = useRef<{ panel: ActivePanel; topic: string | null } | null>(null)
  // Navigation stack for desktop back navigation
  const navigationStack = useRef<NavigationEntry[]>([{ panel: "conversations", topic: null }])

  const [state, setState] = useState<ResponsiveLayoutState>({
    activePanel: "conversations",
    selectedConversationTopic: null,
  })

  // Sync history when entering mobile mode (always reconcile with current state)
  useEffect(() => {
    // Only act when transitioning from desktop to mobile
    if (isMobile && !prevIsMobileRef.current) {
      // If not at root panel, seed conversations at depth 0 then push current at depth 1
      if (state.activePanel !== "conversations") {
        const rootState = mergeHistoryState(window.history.state, "conversations", null, 0)
        window.history.replaceState(rootState, "")
        historyDepth.current = 1
        const currentState = mergeHistoryState(window.history.state, state.activePanel, state.selectedConversationTopic, 1)
        window.history.pushState(currentState, "")
      } else {
        const newState = mergeHistoryState(window.history.state, state.activePanel, state.selectedConversationTopic, 0)
        window.history.replaceState(newState, "")
        historyDepth.current = 0
      }
      lastPushedState.current = { panel: state.activePanel, topic: state.selectedConversationTopic }
    }

    // Update previous mobile state for next transition detection
    prevIsMobileRef.current = isMobile
  }, [isMobile, state.activePanel, state.selectedConversationTopic])

  // Handle browser back/forward navigation (mobile only)
  useEffect(() => {
    // Only attach popstate listener on mobile
    if (!isMobile) return

    const handlePopState = (event: PopStateEvent) => {
      const layoutState = getLayoutState(event.state)

      // Only handle events with our namespaced state - ignore unrelated history entries
      if (!layoutState) return

      historyDepth.current = layoutState.depth
      lastPushedState.current = { panel: layoutState.panel, topic: layoutState.topic }
      setState({
        activePanel: layoutState.panel,
        selectedConversationTopic: layoutState.topic,
      })
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [isMobile])

  // Navigate to conversation list
  const showConversations = useCallback(() => {
    const current = navigationStack.current[navigationStack.current.length - 1]
    const nextPanel: ActivePanel = "conversations"
    const nextTopic: string | null = null

    // No-op if already on conversations with no topic
    if (current.panel === nextPanel && current.topic === nextTopic) {
      return
    }

    // Push to navigation stack for desktop back support
    navigationStack.current.push({ panel: nextPanel, topic: nextTopic })

    setState({
      activePanel: nextPanel,
      selectedConversationTopic: nextTopic,
    })

    // Push to browser history on mobile
    if (isMobile) {
      if (lastPushedState.current?.panel !== nextPanel || lastPushedState.current?.topic !== nextTopic) {
        historyDepth.current += 1
        const newState = mergeHistoryState(window.history.state, nextPanel, nextTopic, historyDepth.current)
        window.history.pushState(newState, "")
        lastPushedState.current = { panel: nextPanel, topic: nextTopic }
      }
    }
  }, [isMobile])

  // Navigate to chat view with topic
  const showChat = useCallback((topic: string) => {
    const current = navigationStack.current[navigationStack.current.length - 1]
    const nextPanel: ActivePanel = "chat"

    // No-op if already on this chat
    if (current.panel === nextPanel && current.topic === topic) {
      return
    }

    // Push to navigation stack for desktop back support
    navigationStack.current.push({ panel: nextPanel, topic })

    setState({
      activePanel: nextPanel,
      selectedConversationTopic: topic,
    })

    // Push to browser history on mobile
    if (isMobile) {
      if (lastPushedState.current?.panel !== nextPanel || lastPushedState.current?.topic !== topic) {
        historyDepth.current += 1
        const newState = mergeHistoryState(window.history.state, nextPanel, topic, historyDepth.current)
        window.history.pushState(newState, "")
        lastPushedState.current = { panel: nextPanel, topic }
      }
    }
  }, [isMobile])

  // Navigate to settings/wallet panel (clears topic for clean state)
  const showSettings = useCallback(() => {
    const current = navigationStack.current[navigationStack.current.length - 1]
    const nextPanel: ActivePanel = "settings"
    const nextTopic: string | null = null

    // No-op if already on settings
    if (current.panel === nextPanel) {
      return
    }

    // Push to navigation stack for desktop back support
    navigationStack.current.push({ panel: nextPanel, topic: nextTopic })

    setState({
      activePanel: nextPanel,
      selectedConversationTopic: nextTopic,
    })

    // Push to browser history on mobile
    if (isMobile) {
      if (lastPushedState.current?.panel !== nextPanel || lastPushedState.current?.topic !== nextTopic) {
        historyDepth.current += 1
        const newState = mergeHistoryState(window.history.state, nextPanel, nextTopic, historyDepth.current)
        window.history.pushState(newState, "")
        lastPushedState.current = { panel: nextPanel, topic: nextTopic }
      }
    }
  }, [isMobile])

  // Return to previous panel
  const goBack = useCallback(() => {
    if (isMobile && historyDepth.current > 0) {
      // Use browser history for proper back navigation on mobile
      window.history.back()
    } else {
      // Desktop or mobile at root: use internal navigation stack
      if (navigationStack.current.length > 1) {
        // Pop current entry
        navigationStack.current.pop()
        // Get previous entry
        const previous = navigationStack.current[navigationStack.current.length - 1]
        setState({
          activePanel: previous.panel,
          selectedConversationTopic: previous.topic,
        })
      } else {
        // At root, ensure we're on conversations
        setState({
          activePanel: "conversations",
          selectedConversationTopic: null,
        })
      }
    }
  }, [isMobile])

  const value: ResponsiveLayoutContextValue = useMemo(() => ({
    activePanel: state.activePanel,
    selectedConversationTopic: state.selectedConversationTopic,
    isMobile,
    showConversations,
    showChat,
    showSettings,
    goBack,
  }), [state.activePanel, state.selectedConversationTopic, isMobile, showConversations, showChat, showSettings, goBack])

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

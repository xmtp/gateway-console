# fn-2.2 Create responsive layout hook and context

## Description

Create a responsive layout hook and context to manage mobile panel visibility state.

**Create:** `/src/hooks/useResponsiveLayout.ts`

**Functionality:**
1. `useIsMobile()` - Returns true when viewport < 768px (uses @mantine/hooks useMediaQuery)
2. `ResponsiveLayoutProvider` - Context provider for panel state
3. `useResponsiveLayout()` - Hook to access panel state and navigation functions

**State to manage:**
- `activePanel`: 'conversations' | 'chat' | 'settings'
- `selectedConversationTopic`: string | null

**Navigation functions:**
- `showConversations()` - Navigate to conversation list
- `showChat(topic)` - Navigate to chat view with topic
- `showSettings()` - Navigate to settings/wallet panel
- `goBack()` - Return to previous panel

**Important:**
- Use `@mantine/hooks` useMediaQuery which is already installed
- Handle SSR-safe initial value (default to desktop/false)
- State should work with browser back button where possible

## Files to reference

- `/src/lib/utils.ts` - For cn() utility pattern
- `@mantine/hooks` docs: https://mantine.dev/hooks/use-media-query/
## Acceptance
- [ ] `useIsMobile()` hook returns correct value at 768px breakpoint
- [ ] `ResponsiveLayoutProvider` wraps app without errors
- [ ] `useResponsiveLayout()` returns panel state and navigation functions
- [ ] Panel state transitions work: conversations → chat → back to conversations
- [ ] `npm run typecheck` passes
## Done summary
- Created `/src/hooks/useResponsiveLayout.tsx` with responsive layout hook and context
- Implemented `useIsMobile()` hook using @mantine/hooks useMediaQuery at 768px breakpoint
- Added `ResponsiveLayoutProvider` context for panel state management
- Implemented navigation functions: showConversations, showChat, showSettings, goBack
- Added browser back button integration for mobile navigation

Why:
- Provides foundation for mobile-responsive panel navigation
- Enables conditional rendering based on viewport size

Verification:
- `npm run typecheck` passes
- `npm run build` passes
## Evidence
- Commits: 64eabc52ea7119dbf46d344ad482da3bcec8e3ba
- Tests: npm run typecheck, npm run build
- PRs:
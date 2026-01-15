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
TBD

## Evidence
- Commits:
- Tests:
- PRs:

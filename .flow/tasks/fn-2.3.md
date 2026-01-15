# fn-2.3 Update App.tsx with responsive breakpoints

## Description

Update App.tsx to use responsive breakpoints and conditional panel rendering based on the responsive layout hook.

**Current state (App.tsx:23-159):**
- Fixed two-column layout
- Left sidebar: `w-72` (UserList with wallet)
- Main area: conversation list `w-72` + chat view `flex-1`

**Target state:**
- Desktop (>= 768px): Show all panels (current behavior)
- Mobile (< 768px): Single panel view based on `activePanel` state

**Changes needed:**

1. Wrap App content with `ResponsiveLayoutProvider`
2. Use `useIsMobile()` and `useResponsiveLayout()` hooks
3. Add responsive classes:
   - Left sidebar: `hidden md:flex md:w-72`
   - Conversation list: Show/hide based on `activePanel === 'conversations'`
   - Chat view: Show/hide based on `activePanel === 'chat'`
4. Add mobile header when on mobile
5. Maintain existing desktop behavior

**Key files:**
- `/src/App.tsx:45` - Left sidebar `w-72`
- `/src/App.tsx:99` - Conversation list `w-72`
- `/src/App.tsx:43-44` - Flex container pattern

**Pattern to follow:**
```tsx
// Desktop: always show, Mobile: conditional
<div className={cn(
  "flex flex-col",
  isMobile ? (activePanel === 'conversations' ? 'flex' : 'hidden') : 'w-72'
)}>
```
## Acceptance
- [ ] Mobile viewport (< 768px) shows single panel at a time
- [ ] Desktop viewport (>= 768px) shows all panels (unchanged behavior)
- [ ] Tapping a conversation on mobile navigates to full-screen chat
- [ ] Developer sidebar hidden on mobile by default
- [ ] No horizontal scroll at 320px viewport
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:

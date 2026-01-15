# fn-2.4 Create MobileHeader with menu

## Description

Create a MobileHeader component shown on mobile viewports that provides:
1. Back button (when in chat view)
2. Title (conversation name or "Messages")
3. Hamburger menu to access settings/wallet (opens Sheet)

**Create:** `/src/components/layout/MobileHeader.tsx`

**Design:**
- Height: 56px (standard mobile header)
- Fixed at top of mobile viewport
- Contains:
  - Left: Back arrow (ChevronLeft icon) when in chat, else Menu icon
  - Center: Title text
  - Right: Menu button (hamburger or settings icon)

**Menu content (via Sheet):**
- Wallet connection status
- Faucet button
- Deposit button
- Test user selector (if in dev mode)
- Gateway status

**Use existing components:**
- Sheet from `/src/components/ui/sheet.tsx`
- Button with icon-sm variant
- Icons from lucide-react

**Integration:**
- Only render when `isMobile` is true
- Back button calls `goBack()` from responsive layout hook
- Menu button opens Sheet with settings content

## Files to reference

- `/src/components/ui/button.tsx:7-37` - buttonVariants
- `/src/components/users/UserList.tsx` - Content to put in menu
## Acceptance
- [ ] MobileHeader visible only on mobile (< 768px)
- [ ] Back button appears when viewing a chat
- [ ] Back button returns to conversation list
- [ ] Menu button opens Sheet with wallet/settings
- [ ] Sheet contains wallet connection, faucet, deposit buttons
- [ ] Touch targets are minimum 44px
- [ ] `npm run typecheck` passes
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:

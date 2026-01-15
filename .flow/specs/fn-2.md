# Responsive Layout and Design

## Overview

Transform the **token-messenger** app from a desktop-only layout to a fully responsive design that works on mobile devices (320px+), tablets, and desktops.

**This is an XMTP-based messaging application** (NOT a Funding Portal). The app has:
- Conversation list with DM and group chats
- Message thread view with real-time messaging
- Wallet integration for paying message costs

**Current state:** Fixed two-column layout with `w-72` (288px) sidebars requiring 576px+ width minimum. No mobile support.

**Target state:** Mobile-first responsive layout using stack navigation on mobile (< 768px) and multi-column on desktop (>= 768px).

## Codebase Evidence

### Components that DO exist (verified via `ls`):
- `/src/components/messaging/ConversationList.tsx` (5352 bytes)
- `/src/components/messaging/MessageThread.tsx` (11952 bytes)
- `/src/components/messaging/MessageInput.tsx` (2138 bytes)
- `/src/components/messaging/NewConversationDialog.tsx` (7830 bytes)
- `/src/components/messaging/NewGroupDialog.tsx` (9529 bytes)
- `/src/components/messaging/GroupSettingsDialog.tsx` (11184 bytes)
- `/src/components/faucet/FaucetDialog.tsx`
- `/src/components/deposit/DepositDialog.tsx`

### Components that do NOT exist:
- NO `/src/components/base/` directory
- NO `SidebarLayout` component
- NO `BalanceCard` component
- NO existing Sheet or Drawer in `/src/components/ui/`
- NO `useBreakpoint` hook

### Existing UI components in `/src/components/ui/`:
- badge.tsx, button.tsx, dialog.tsx, input.tsx, label.tsx
- scroll-area.tsx, skeleton.tsx, tooltip.tsx, copyable-address.tsx
- **Sheet and Drawer are NOT present - they must be installed**

## Scope

### In Scope
- Responsive main layout (App.tsx) with mobile breakpoints
- Mobile navigation pattern (stack: list → detail with back button)
- Developer sidebar hidden on mobile, accessible via header menu
- Dialogs converted to bottom sheets on mobile
- Touch-friendly sizing (44-48px tap targets)
- Safe area support for iOS notch/home indicator

### Out of Scope
- Complex touch gestures (swipe-to-delete, pull-to-refresh)
- PWA/offline support
- Dark mode improvements (already working)
- Performance optimization / code splitting

## Approach

1. **Install missing shadcn/ui components** - Sheet and Drawer do NOT exist in this repo
2. **Create responsive layout hook** with `useIsMobile()` using @mantine/hooks useMediaQuery
3. **Create panel state context** using React Context for mobile panel visibility
4. **Update App.tsx** with responsive breakpoints and conditional panel rendering
5. **Create MobileHeader component** with hamburger menu for settings/wallet access
6. **Update dialogs** to use Drawer on mobile, Dialog on desktop:
   - NewConversationDialog.tsx
   - NewGroupDialog.tsx
   - GroupSettingsDialog.tsx
   - FaucetDialog.tsx
   - DepositDialog.tsx
7. **Add safe-area CSS** for iOS devices
8. **Increase touch targets** where needed

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Navigation model | Stack navigation | Standard messaging app pattern |
| Mobile breakpoint | < 768px | Matches md: in Tailwind |
| Panel state | React Context only | Simple local state for this app |
| Dialogs on mobile | Bottom sheet (Drawer) | Touch-friendly UX |

## Quick Commands

```bash
# Run dev server
npm run dev

# Type check (smoke test)
npm run typecheck

# Build
npm run build
```

## Acceptance Criteria

- [ ] App is usable on 320px wide viewport (iPhone SE)
- [ ] ConversationList visible on mobile, tapping opens MessageThread full-screen
- [ ] Back button in MobileHeader returns from MessageThread to ConversationList
- [ ] Developer sidebar (UserList) accessible via header menu on mobile
- [ ] All dialogs usable on mobile without horizontal scroll
- [ ] Touch targets are minimum 44px
- [ ] No horizontal scroll on any mobile viewport
- [ ] Layout transitions smoothly on viewport resize

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| useMediaQuery in Vite SPA | No SSR, so no hydration concerns |
| Sheet/Drawer missing | Task fn-2.1 installs these first |
| Focus management in Drawer | Radix primitives handle focus trapping |
| Dialog forms unusable on mobile | Test all form flows after conversion |
| iOS safe area not applied | Use env() CSS variables with fallbacks |
| MessageInput covered by keyboard | Fixed positioning with safe-area-inset-bottom |

## Testing Strategy

- Test at 320px, 375px, 768px, 1024px viewports
- Test touch targets with Chrome DevTools device mode
- Test iOS safe areas with Safari responsive design mode
- Verify all dialogs work on mobile after Drawer conversion

## References

- Tailwind responsive utilities: https://tailwindcss.com/docs/responsive-design
- shadcn/ui Sheet: https://ui.shadcn.com/docs/components/sheet
- shadcn/ui Drawer: https://ui.shadcn.com/docs/components/drawer
- @mantine/hooks useMediaQuery: https://mantine.dev/hooks/use-media-query/

### Key Files to Modify
- `/src/App.tsx` - Main layout with fixed w-72 sidebars
- `/src/components/ui/dialog.tsx` - Dialog base component
- `/src/components/messaging/ConversationList.tsx` - List panel
- `/src/components/messaging/MessageThread.tsx` - Chat panel
- `/src/components/users/UserList.tsx` - Left sidebar content
- `/src/index.css` - Add safe-area CSS variables

# fn-2.6 Add safe-area CSS and touch target improvements

## Description

Add safe-area CSS support for iOS devices and improve touch target sizes.

**Safe area CSS (in `/src/index.css`):**
```css
/* iOS safe area support */
:root {
  --safe-area-inset-top: env(safe-area-inset-top, 0px);
  --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-inset-left: env(safe-area-inset-left, 0px);
  --safe-area-inset-right: env(safe-area-inset-right, 0px);
}
```

**Apply safe areas:**
- MobileHeader: `padding-top: var(--safe-area-inset-top)`
- Message input area: `padding-bottom: var(--safe-area-inset-bottom)`
- Sheet/Drawer: Account for safe areas

**Touch target improvements:**

Current issues (gap analysis findings):
- Some buttons are `h-8 w-8` (32px) - below 44px minimum

Files to check and update:
- `/src/components/messaging/MessageInput.tsx` - Send button
- `/src/components/messaging/MessageThread.tsx` - Action buttons
- `/src/components/messaging/ConversationList.tsx` - Conversation items
- MobileHeader buttons

**Target:**
- All interactive elements minimum 44px touch target
- Use `min-h-[44px] min-w-[44px]` or padding to achieve this
- Add `touch-manipulation` class where appropriate for faster taps

## Files to reference

- `/src/index.css:55` - Existing min-width: 320px
- `/src/components/ui/button.tsx:26-31` - Icon button sizes
## Acceptance
- [ ] Safe area CSS variables defined in index.css
- [ ] MobileHeader respects safe-area-inset-top
- [ ] Message input respects safe-area-inset-bottom
- [ ] All buttons have minimum 44px touch target
- [ ] Conversation list items have adequate tap area
- [ ] `touch-manipulation` applied to interactive elements
- [ ] `npm run typecheck` passes
- [ ] Visual test on iOS simulator or device shows no notch overlap
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:

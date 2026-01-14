# fn-1.9 Message Cost Display

## Description

Display message cost based on actual payload size, updating in real-time as user types.

### Components to Create

1. **MessageCostBadge** - Small inline cost display
2. **CostBreakdown** - Detailed cost explanation (optional tooltip)

### Implementation

```typescript
// Calculate cost for specific message
const calculateMessageCost = (
  messageBytes: number,
  rates: Rate[]
): AverageCostResult => {
  return calculateCostPerMessageFromRates(rates, formatBalance, {
    messageBytes,
    storageDays: 60,
    gasOverheadEstimate: 1.25,
  });
};

// In MessageInput
const messageBytes = new TextEncoder().encode(messageText).length;
const cost = calculateMessageCost(messageBytes, rates);
```

### UI Requirements

1. **Before sending**: Show estimated cost updating as user types
   - "~$0.00005" next to send button
   - Updates in real-time based on character count

2. **After sending**: Show actual cost in message bubble
   - Small badge: "Cost: $0.00005"
   - Subtle, non-intrusive

3. **Cost breakdown** (on hover/click):
   - Base fee: $0.0000385
   - Storage: $0.0000132 (132 bytes × 60 days)
   - Total: $0.0000517

### Balance Impact

- After each send, update "messages available" counter
- Show brief animation when balance decreases

### Reference

- `~/Developer/funding-portal/src/utils/messageCosting.ts`
## Acceptance

- [ ] Shows estimated cost while typing message
- [ ] Cost updates in real-time as message length changes
- [ ] Shows actual cost after message is sent
- [ ] Cost calculation uses on-chain rates
- [ ] Longer messages show higher costs
- [ ] Balance/messages-available updates after sending
- [ ] Cost display is subtle and non-intrusive
## Done summary
# fn-1.9: Message Cost Display

Implemented real-time message cost display based on message size.

## Files Created
- `src/components/messaging/MessageCostBadge.tsx` - Cost display component with breakdown tooltip
- `src/components/ui/tooltip.tsx` - Tooltip component from shadcn

## Files Updated
- `src/lib/messageCosting.ts` - Added calculateMessageCost, formatMicroCost, getMessageBytes
- `src/components/messaging/MessageInput.tsx` - Added cost badge and balance refresh
- `src/components/messaging/index.ts` - Export MessageCostBadge

## Features
- Shows estimated cost (~$0.00005) while typing message
- Cost updates in real-time as message length changes
- Tooltip shows cost breakdown (base fee + storage fee)
- Balance refreshes after sending to update messages available
- Uses actual message byte length for storage calculation
## Evidence
- Commits:
- Tests:
- PRs:
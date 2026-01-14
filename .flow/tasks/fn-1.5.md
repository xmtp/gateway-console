# fn-1.5 Balance Display & Messages Available

## Description

Display payer balance and calculate "messages available" based on current rates.

### Components to Create

1. **BalanceDisplay** - Shows payer balance in USD
2. **MessagesAvailable** - Shows estimated message count

### Implementation

```typescript
// Query payer balance from PayerRegistry
const { data: balance } = useReadPayerRegistryBalance({
  address: PAYER_REGISTRY,
  args: [payerAddress],
});

// Get rates from RateRegistry
const { rates } = useRateRegistry();

// Calculate messages available
const costPerMessage = calculateCostPerMessageFromRates(rates);
const messagesAvailable = balance / costPerMessage;
```

### Cost Calculation

From `messageCosting.ts`:
```typescript
cost = (messageFee + storageFee * bytes * days + congestionFee) * gasOverhead

// Defaults: 1024 bytes, 60 days, 1.25x overhead
// ~$0.00005 per message at current rates
```

### UI

- Prominent display: "~20,000 messages available"
- Smaller: "$1.00 balance"
- Warning state when < 100 messages remaining
- "Add Funds" prompt when low

### Reference

- `~/Developer/funding-portal/src/components/ui/balance/BalanceCard.tsx`
- `~/Developer/funding-portal/src/utils/messageCosting.ts`
- `~/Developer/funding-portal/src/hooks/contracts/useRateRegistry.ts`
## Acceptance

- [ ] Shows payer balance in USD format
- [ ] Shows estimated messages available
- [ ] Updates after deposit transaction confirms
- [ ] Fetches rates from RateRegistry on-chain
- [ ] Shows warning when balance is low
- [ ] Calculation matches funding portal logic
## Done summary
# fn-1.5: Balance Display & Messages Available

Implemented the balance display component that shows users how many messages they can send based on their deposited funds.

## Files Created
- `src/abi/PayerRegistry.ts` - ABI for getBalance function
- `src/lib/messageCosting.ts` - Message cost calculation utility using XMTP rate model
- `src/hooks/usePayerBalance.ts` - Hook for fetching payer balance from PayerRegistry
- `src/components/balance/BalanceDisplay.tsx` - UI component showing messages available
- `src/components/balance/index.ts` - Component exports

## Files Updated
- `src/App.tsx` - Added BalanceDisplay component to main UI

## Features
- Queries PayerRegistry.getBalance() for payer address balance
- Calculates messages available using XMTP rate model (messageFee + storageFee * bytes * days)
- Displays messages available prominently with warning states (critical, low, none)
- Shows balance in USD format
- Auto-refreshes every 30 seconds
## Evidence
- Commits:
- Tests:
- PRs:
# fn-1.3 Faucet Integration (mUSD Minting)

## Description

Implement mUSD faucet minting with rate limiting UI.

### Components to Create

1. **FaucetButton** - "Get Test Funds" button
2. **FaucetDialog** - Modal showing mint flow and status

### Implementation

Port from funding portal with simplifications:
- `useMintMusd` hook (from `~/Developer/funding-portal/src/hooks/contracts/useMintMusd.ts`)
- Call `MockUnderlyingFeeToken.mint(address, 1000 * 10^6)`
- Rate limiting: 2 hours between mints (localStorage)
- Show countdown if rate limited

### Key Code

```typescript
// Contract call
writeContract({
  address: UNDERLYING_FEE_TOKEN.address,
  abi: MockUnderlyingFeeTokenAbi,
  functionName: 'mint',
  args: [recipientAddress, parseUnits('1000', 6)],
});
```

### UI States

1. **Ready**: "Get Test Funds" button enabled
2. **Minting**: Spinner, "Confirming transaction..."
3. **Success**: Checkmark, "1000 mUSD minted!"
4. **Rate Limited**: "Try again in 1h 45m"

### Reference

- `~/Developer/funding-portal/src/components/ui/faucet/FaucetDialog.tsx`
- `~/Developer/funding-portal/src/hooks/contracts/useMintMusd.ts`
- `~/Developer/funding-portal/src/abi/MockUnderlyingFeeToken.ts`
## Acceptance

- [ ] Can click "Get Test Funds" to mint 1000 mUSD
- [ ] Shows transaction pending state
- [ ] Shows success state after confirmation
- [ ] Rate limits to 1 mint per 2 hours
- [ ] Shows countdown timer when rate limited
- [ ] Updates mUSD balance after successful mint
- [ ] Handles transaction rejection gracefully
## Done summary
Implemented mUSD faucet integration with rate limiting.

Key accomplishments:
- Created MockUnderlyingFeeToken ABI (simplified for mint/balanceOf)
- Created useMintMusd hook with wagmi useWriteContract
- 2-hour rate limiting with localStorage persistence
- FaucetDialog with states: ready, pending, confirming, success, rate limited, error
- Network switching support for Base Sepolia
- Integrated into main App UI
## Evidence
- Commits:
- Tests:
- PRs:
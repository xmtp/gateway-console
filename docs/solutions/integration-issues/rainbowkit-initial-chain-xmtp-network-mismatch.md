---
title: "RainbowKit Initial Chain Configuration for XMTP Integration"
description: "Wallets connect to wrong network (mainnet) instead of Base Sepolia, causing XMTP initialization failures and 'Switch Network' prompts"
category: integration-issues
tags:
  - rainbowkit
  - wagmi
  - xmtp
  - wallet-connect
  - network-detection
  - base-sepolia
  - smart-contract-wallet
  - eoa
date: 2026-01-19
components:
  - src/components/wallet/WalletProvider.tsx
  - src/lib/wagmi.ts
  - src/lib/xmtp-signer.ts
  - src/contexts/XMTPContext.tsx
  - tests/e2e/wallet-mock.js
symptoms:
  - "Switch to Base Sepolia" prompt appears immediately after wallet connects
  - XMTP signature validation failed error
  - Chain switch fails with "Missing or invalid" method error
  - Wallets like Rainbow and Coinbase connect to mainnet instead of requested chain
technologies:
  - react
  - typescript
  - rainbowkit
  - wagmi-v2
  - viem
  - xmtp-browser-sdk
---

# RainbowKit Initial Chain Configuration for XMTP Integration

## Problem

After connecting a wallet through RainbowKit, users see "Switch to Base Sepolia" even though they never selected a different network. This causes:

1. **Wrong network detection** - App thinks wallet is on mainnet
2. **XMTP failures** - Client creation fails with "Signature validation failed"
3. **Chain switch errors** - Some wallets throw "Missing or invalid" method errors

## Root Cause

The `RainbowKitProvider` was missing the `initialChain` prop. Without it, wallets that don't have the requested chain pre-configured (Rainbow, Coinbase, Base) default to their preferred chain (usually Ethereum mainnet).

```tsx
// BEFORE - Missing initialChain
<RainbowKitProvider theme={darkTheme()}>
  {children}
</RainbowKitProvider>
```

The chain array order in wagmi config (`chains: [baseSepolia, mainnet]`) is **not sufficient** - RainbowKit needs explicit `initialChain` to request the correct network during connection.

## Solution

Add `initialChain={baseSepolia}` to the RainbowKitProvider:

```tsx
// src/components/wallet/WalletProvider.tsx
import { baseSepolia } from 'wagmi/chains'

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          initialChain={baseSepolia}  // <-- THE FIX
          theme={darkTheme({
            accentColor: '#3b82f6',
            accentColorForeground: 'white',
            borderRadius: 'medium',
          })}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

## Additional Issue: EOA vs SCW Signers

During investigation, we discovered a related issue affecting Coinbase Wallet and Base Wallet specifically:

### The Problem

XMTP requires different signer types:
- **EOA (Externally Owned Account)**: MetaMask, Rainbow - uses `type: 'EOA'`
- **SCW (Smart Contract Wallet)**: Coinbase, Base - uses `type: 'SCW'` with `getChainId()`

The app only implements EOA signers:

```typescript
// Current implementation - EOA only
export function createWalletSigner(walletClient: WalletClient, address: Address): Signer {
  return {
    type: 'EOA',
    getIdentifier: () => ({ identifier: address.toLowerCase(), identifierKind: IdentifierKind.Ethereum }),
    signMessage: async (message: string) => {
      const signature = await walletClient.signMessage({ account: address, message })
      return toBytes(signature)
    },
  }
}
```

### Required: SCW Signer Implementation

For Smart Contract Wallets, XMTP needs:

```typescript
// Needed for Coinbase/Base wallets
export function createSCWSigner(
  walletClient: WalletClient,
  address: Address,
  chainId: number
): Signer {
  return {
    type: 'SCW',
    getIdentifier: () => ({
      identifier: address.toLowerCase(),
      identifierKind: IdentifierKind.Ethereum,
    }),
    signMessage: async (message: string) => {
      const signature = await walletClient.signMessage({ account: address, message })
      return toBytes(signature)
    },
    getChainId: () => BigInt(chainId),  // Required for SCW
  }
}
```

### SCW Detection

Detect SCW wallets by connector ID or wallet flags:

```typescript
const SCW_CONNECTOR_IDS = ['coinbaseWalletSDK', 'com.coinbase.wallet']

function isSCWWallet(connector: Connector): boolean {
  return SCW_CONNECTOR_IDS.includes(connector.id) ||
         (window.ethereum as any)?.isCoinbaseWallet
}
```

## E2E Testing

Added test to catch this regression:

```javascript
// tests/e2e/test-runner.js
'correct-chain-after-connect': {
  name: 'Wallet connects on correct chain (Base Sepolia)',
  requiresWallet: true,
  run: async () => {
    // ... inject wallet on Base Sepolia (84532)
    // ... connect through RainbowKit modal

    const afterSnap = snapshot()
    const hasWrongNetworkWarning =
      afterSnap.toLowerCase().includes('switch to base sepolia') ||
      afterSnap.toLowerCase().includes('wrong network')

    // FAILS if wrong network warning appears when wallet is on correct chain
    assert(!hasWrongNetworkWarning,
      'Should NOT show wrong network warning when wallet is on Base Sepolia')
  },
}
```

## Prevention Checklist

- [ ] `RainbowKitProvider` has `initialChain` prop set
- [ ] Desired chain is first in wagmi `chains` array
- [ ] All chains have transport configured
- [ ] SCW wallets detected and use `createSCWSigner`
- [ ] E2E test verifies no wrong network warning after connect

## Warning Signs

| Symptom | Likely Cause |
|---------|--------------|
| "Switch to Base Sepolia" after connect | Missing `initialChain` prop |
| XMTP "Signature validation failed" | Wrong signer type (EOA vs SCW) |
| "Unrecognized chain ID" error | Chain not in wagmi config |
| Chain switch "Missing or invalid" | Wallet doesn't support method |

## Related

- [XMTP Signer Documentation](https://docs.xmtp.org/chat-apps/core-messaging/create-a-signer)
- [RainbowKit initialChain](https://www.rainbowkit.com/docs/api-provider#initialchain)
- [EIP-6963 Wallet Discovery](https://eips.ethereum.org/EIPS/eip-6963)

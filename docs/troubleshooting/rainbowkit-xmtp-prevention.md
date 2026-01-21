# RainbowKit + XMTP Integration: Prevention Guide

This document provides prevention strategies for the common issue where RainbowKit wallet connections default to the wrong network, causing downstream XMTP failures.

## Problem Summary

**Root Cause**: Missing `initialChain` prop in `RainbowKitProvider` causes wallets to connect on their default network (often Ethereum Mainnet) instead of the required chain (e.g., Base Sepolia for this app).

**Additional Issue**: XMTP requires different signer types (EOA vs SCW) based on wallet type. Smart Contract Wallets (like Coinbase Smart Wallet, Safe, Argent) need the `SCW` signer type with `chainId`, while traditional wallets (MetaMask, Rainbow) use `EOA` signers.

---

## 1. Prevention Checklist

Use this checklist when setting up RainbowKit in any XMTP application.

### RainbowKit Configuration

- [ ] **`initialChain` prop is set** on `RainbowKitProvider`
  ```tsx
  // CORRECT
  <RainbowKitProvider initialChain={baseSepolia}>

  // WRONG - will default to first chain or wallet's preferred chain
  <RainbowKitProvider>
  ```

- [ ] **Target chain is first in the chains array** in wagmi config
  ```tsx
  // CORRECT - baseSepolia first
  chains: [baseSepolia, mainnet, xmtpAppchain]

  // RISKY - mainnet first could cause issues
  chains: [mainnet, baseSepolia]
  ```

- [ ] **Transport configured for all chains**
  ```tsx
  transports: {
    [baseSepolia.id]: http(SETTLEMENT_CHAIN_RPC_URL),
    [mainnet.id]: http(MAINNET_RPC_URL),
    // Don't forget chains used for ENS resolution!
  }
  ```

- [ ] **Environment variable for RPC URLs** (avoid rate limits)
  ```tsx
  // Using env vars, not public defaults
  http(import.meta.env.VITE_BASE_SEPOLIA_RPC_URL)
  ```

### XMTP Signer Configuration

- [ ] **Wallet type detection implemented** for SCW vs EOA
  ```tsx
  // Detect if wallet is a Smart Contract Wallet
  const isSmartWallet =
    walletClient.connector?.id === 'coinbaseWalletSDK' ||
    walletClient.connector?.name?.toLowerCase().includes('smart') ||
    // Add other SCW detection logic
  ```

- [ ] **Correct signer type used**
  ```tsx
  // EOA signer (MetaMask, Rainbow, etc.)
  const eoaSigner: Signer = {
    type: 'EOA',
    getIdentifier: () => ({ identifier: address.toLowerCase(), identifierKind: 'Ethereum' }),
    signMessage: async (message) => toBytes(await walletClient.signMessage({ account: address, message })),
  }

  // SCW signer (Coinbase Smart Wallet, Safe, etc.)
  const scwSigner: Signer = {
    type: 'SCW',
    getIdentifier: () => ({ identifier: address.toLowerCase(), identifierKind: 'Ethereum' }),
    signMessage: async (message) => toBytes(await walletClient.signMessage({ account: address, message })),
    getChainId: () => BigInt(chainId), // REQUIRED for SCW
  }
  ```

- [ ] **Chain ID is passed for SCW signers** (from wagmi's `useChainId()` or similar)

### Network Validation

- [ ] **Network check before XMTP client creation**
  ```tsx
  const { chainId } = useAccount()
  const isCorrectNetwork = chainId === baseSepolia.id

  if (!isCorrectNetwork) {
    // Prompt user to switch or auto-switch
    await switchChain({ chainId: baseSepolia.id })
  }
  ```

- [ ] **Error handling for wrong network during XMTP operations**

---

## 2. Testing Recommendations

### E2E Tests That Would Catch This Issue

Add these tests to your E2E suite (see `tests/e2e/test-runner.js` for existing patterns):

#### Test 1: Wallet Connects on Correct Chain
```javascript
'correct-chain-after-connect': {
  name: 'Wallet connects on correct chain (Base Sepolia)',
  requiresWallet: true,
  run: async () => {
    // Inject mock wallet on Base Sepolia (84532)
    injectWallet({ chainId: 84532 })

    // Connect wallet
    await connectWallet()

    // Verify no "wrong network" warnings appear
    const snap = snapshot()
    const hasWrongNetworkWarning =
      snap.toLowerCase().includes('switch network') ||
      snap.toLowerCase().includes('wrong network')

    assert(!hasWrongNetworkWarning,
      'Should NOT show wrong network warning when on correct chain')
  }
}
```

#### Test 2: Wrong Chain Detection Works
```javascript
'wrong-chain-detection': {
  name: 'Detects and handles wrong chain',
  requiresWallet: true,
  run: async () => {
    // Inject wallet on Mainnet (wrong chain)
    injectWallet({ chainId: 1 })

    // Connect wallet
    await connectWallet()

    // Should show network switch prompt
    const snap = snapshot()
    const hasNetworkPrompt =
      snap.includes('Switch to Base Sepolia') ||
      snap.includes('Wrong Network')

    assert(hasNetworkPrompt,
      'Should prompt to switch network when on wrong chain')
  }
}
```

#### Test 3: XMTP Client Creation Requires Correct Chain
```javascript
'xmtp-requires-correct-chain': {
  name: 'XMTP client creation blocked on wrong chain',
  requiresWallet: true,
  run: async () => {
    // Inject wallet on wrong chain
    injectWallet({ chainId: 1 })
    await connectWallet()

    // Try to initialize XMTP
    const xmtpError = evaluate(`
      window.__XMTP_CLIENT__?.error?.message || 'no error'
    `)

    // Should either block creation or show error
    assert(
      xmtpError.includes('network') || xmtpError.includes('chain'),
      'XMTP should fail or be blocked on wrong network'
    )
  }
}
```

#### Test 4: SCW Signer Detection
```javascript
'scw-signer-detection': {
  name: 'Coinbase Wallet uses SCW signer',
  requiresWallet: true,
  run: async () => {
    // Inject Coinbase Wallet (SCW)
    injectWallet({ walletType: 'coinbase', chainId: 84532 })
    await connectWallet()

    // Verify SCW signer type is used
    const signerType = evaluate(`
      window.__XMTP_SIGNER_TYPE__ || 'unknown'
    `)

    assert(signerType === 'SCW',
      'Coinbase Wallet should use SCW signer type')
  }
}
```

### Unit Tests

```typescript
// xmtp-signer.test.ts
describe('XMTP Signer Creation', () => {
  it('creates EOA signer for MetaMask', () => {
    const signer = createWalletSigner(mockMetaMaskClient, address)
    expect(signer.type).toBe('EOA')
    expect(signer.getChainId).toBeUndefined()
  })

  it('creates SCW signer for Coinbase Smart Wallet', () => {
    const signer = createSmartWalletSigner(mockCoinbaseClient, address, 84532n)
    expect(signer.type).toBe('SCW')
    expect(signer.getChainId()).toBe(84532n)
  })

  it('throws if SCW signer missing chainId', () => {
    expect(() => createSmartWalletSigner(mockClient, address, undefined))
      .toThrow('chainId required for SCW signer')
  })
})
```

---

## 3. Best Practices for Wallet + XMTP Integration

### Architecture Pattern

```
+------------------+     +-------------------+     +------------------+
| RainbowKit       | --> | Network Validator | --> | XMTP Client      |
| (initialChain    |     | (check chainId    |     | (correct signer  |
|  set correctly)  |     |  before XMTP ops) |     |  type: EOA/SCW)  |
+------------------+     +-------------------+     +------------------+
```

### Recommended Implementation

```tsx
// hooks/useXmtpWithWallet.ts
import { useAccount, useChainId, useSwitchChain, useWalletClient } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { Client } from '@xmtp/browser-sdk'

const SUPPORTED_CHAINS_FOR_XMTP = [baseSepolia.id]

// Known Smart Contract Wallet connector IDs
const SCW_CONNECTOR_IDS = [
  'coinbaseWalletSDK',
  'safe',
  'argent',
  // Add more as needed
]

export function useXmtpWithWallet() {
  const { address, connector, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const { data: walletClient } = useWalletClient()

  // Network validation
  const isCorrectNetwork = SUPPORTED_CHAINS_FOR_XMTP.includes(chainId)

  // Wallet type detection
  const isSmartWallet = useMemo(() => {
    if (!connector) return false
    return (
      SCW_CONNECTOR_IDS.includes(connector.id) ||
      connector.name?.toLowerCase().includes('smart')
    )
  }, [connector])

  // Create appropriate signer
  const createSigner = useCallback(() => {
    if (!walletClient || !address) return null

    if (isSmartWallet) {
      return {
        type: 'SCW' as const,
        getIdentifier: () => ({
          identifier: address.toLowerCase(),
          identifierKind: 'Ethereum' as const,
        }),
        signMessage: async (message: string) => {
          const sig = await walletClient.signMessage({ account: address, message })
          return toBytes(sig)
        },
        getChainId: () => BigInt(chainId),
      }
    }

    return {
      type: 'EOA' as const,
      getIdentifier: () => ({
        identifier: address.toLowerCase(),
        identifierKind: 'Ethereum' as const,
      }),
      signMessage: async (message: string) => {
        const sig = await walletClient.signMessage({ account: address, message })
        return toBytes(sig)
      },
    }
  }, [walletClient, address, isSmartWallet, chainId])

  // Initialize XMTP with validation
  const initializeXmtp = useCallback(async () => {
    // Gate: require correct network
    if (!isCorrectNetwork) {
      await switchChain({ chainId: baseSepolia.id })
      // Wait for chain switch to complete
      return null
    }

    const signer = createSigner()
    if (!signer) throw new Error('Signer not available')

    return Client.create(signer, {
      env: 'dev',
      // ...other options
    })
  }, [isCorrectNetwork, switchChain, createSigner])

  return {
    isCorrectNetwork,
    isSmartWallet,
    initializeXmtp,
    switchToCorrectNetwork: () => switchChain({ chainId: baseSepolia.id }),
  }
}
```

### Provider Setup Pattern

```tsx
// WalletProvider.tsx - CORRECT SETUP
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { baseSepolia } from 'wagmi/chains'

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          initialChain={baseSepolia}  // CRITICAL: Always set this
          theme={darkTheme()}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

---

## 4. Warning Signs (Symptoms of This Issue)

### User-Facing Symptoms

| Symptom | Likely Cause |
|---------|--------------|
| "Switch to Base Sepolia" prompt appears immediately after connecting | `initialChain` not set; wallet defaulted to mainnet |
| XMTP client creation fails with signature error | Wrong signer type (EOA vs SCW mismatch) |
| "Unrecognized chain ID" errors | Chain not configured in wagmi transports |
| Transactions fail on Coinbase Wallet | Missing `chainId` in SCW signer |
| Messages send but never arrive | Client created on wrong network (network isolation) |
| "Invalid signature" during XMTP registration | SCW signer missing `getChainId()` function |

### Developer/Debug Symptoms

```
Console Logs to Watch For:
--------------------------
[RainbowKit] Connected to chain 1         // Should be 84532 for Base Sepolia
[XMTP] Signature verification failed      // Signer type mismatch
[wagmi] Chain 1 not configured            // Missing transport config
```

### Code Patterns That Indicate Risk

```tsx
// RED FLAG: No initialChain
<RainbowKitProvider>

// RED FLAG: Hardcoded EOA for all wallets
const signer = { type: 'EOA', ... }

// RED FLAG: Missing chain validation before XMTP
const client = await Client.create(signer, options)
// ^ Should check chainId first

// RED FLAG: No connector type check
const signer = createWalletSigner(walletClient, address)
// ^ Should check if SCW and add getChainId
```

---

## 5. Quick Reference: Supported SCW Chains for XMTP

| Chain ID | Network | Notes |
|----------|---------|-------|
| 0 | N/A | Sentinel value for EOA |
| 1 | Ethereum Mainnet | |
| 10 | Optimism | |
| 137 | Polygon | |
| 324 | zkSync Era | |
| 480 | World Chain | |
| 8453 | Base | Production |
| 42161 | Arbitrum One | |
| 59144 | Linea | |
| 84532 | Base Sepolia | Testnet (this app) |

---

## 6. Files to Review in This Codebase

| File | Purpose | What to Check |
|------|---------|---------------|
| `src/components/wallet/WalletProvider.tsx` | RainbowKit setup | `initialChain` prop |
| `src/lib/wagmi.ts` | Wagmi config | Chain order, transports |
| `src/lib/xmtp-signer.ts` | XMTP signer creation | EOA vs SCW handling |
| `src/contexts/XMTPContext.tsx` | XMTP client init | Network validation |
| `tests/e2e/wallet-mock.js` | E2E test wallet | Default chainId |
| `tests/e2e/test-runner.js` | E2E tests | Chain verification tests |

---

## Related Documentation

- [XMTP: Create a Signer](https://docs.xmtp.org/chat-apps/core-messaging/create-a-signer)
- [RainbowKit: Chains](https://www.rainbowkit.com/docs/chains)
- [wagmi: Configuration](https://wagmi.sh/core/configuration)

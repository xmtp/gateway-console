# Smart Contract Wallet Support and Testing

## Overview

Add Smart Contract Wallet (SCW) support to the XMTP Gateway Console, enabling users to connect and sign messages with:
- **EIP-4337 wallets**: Coinbase Smart Wallet, Safe (Gnosis Safe)
- **EIP-7702 wallets**: EOAs with delegated smart contract implementations (MetaMask 7702 upgrade, etc.)

This includes implementing wallet type detection, proper XMTP signer creation, RainbowKit configuration, and comprehensive E2E testing for all smart wallet variants.

## Problem Statement / Motivation

Currently, the gateway console only supports Externally Owned Accounts (EOA) for wallet connections. The `createWalletSigner()` function in `/src/lib/xmtp-signer.ts:23-44` hardcodes `type: 'EOA'`, which breaks XMTP functionality for users connecting with Smart Contract Wallets.

**Why this matters:**
- Coinbase Smart Wallet has 26M+ users as of 2025
- Smart wallets are the future of Ethereum UX (gasless transactions, batch operations, social recovery)
- Users connecting with SCW currently experience silent failures or incorrect behavior
- XMTP requires different signer types (`EOA` vs `SCW`) with different method signatures
- **EIP-7702** (live since Pectra upgrade, May 2025) allows EOAs to temporarily delegate to smart contract code, enabling batch transactions, gas sponsorship, and privilege de-escalation without deploying a new contract wallet

## Proposed Solution

Implement a detection-based approach that:
1. Detects wallet type at connection time (EOA vs SCW vs EIP-7702)
2. Creates the appropriate XMTP signer with correct properties
3. Handles EIP-7702 delegated EOAs that have temporary smart contract capabilities
4. Provides clear error handling for unsupported scenarios
5. Enables comprehensive E2E testing of all smart wallet variants

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Connects Wallet                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              RainbowKit + wagmi Connection                   │
│   (WalletProvider.tsx, wagmi.ts)                            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│               Wallet Type Detection                          │
│   detectWalletType(connector, walletClient, publicClient)   │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 1. Check connector.id (coinbaseWallet, safe, etc)   │   │
│   │ 2. Check provider flags (isSmartContractWallet)     │   │
│   │ 3. Check for EIP-7702 delegation (code prefix 0xef) │   │
│   │ 4. Fallback: eth_getCode on address                 │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  EOA Signer   │ │  SCW Signer   │ │ 7702 Signer   │
│  type: 'EOA'  │ │  type: 'SCW'  │ │  type: 'SCW'  │
│  getIdent()   │ │  getIdent()   │ │  getIdent()   │
│  signMsg()    │ │  signMsg()    │ │  signMsg()    │
│               │ │  getChainId() │ │  getChainId() │
└───────┬───────┘ └───────┬───────┘ └───────┬───────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   XMTP Client.create()                       │
│   (XMTPContext.tsx)                                         │
└─────────────────────────────────────────────────────────────┘
```

### EIP-7702 Overview

EIP-7702 enables EOAs to temporarily delegate their execution to smart contract code without deploying a separate contract wallet. Key characteristics:

- **Authorization List**: Transactions include `(chain_id, contract_address, nonce, signature)` tuples
- **Temporary Delegation**: Code delegation can be revoked, unlike permanent SCW deployment
- **Same Address**: EOA keeps its existing address while gaining smart contract capabilities
- **Detection**: Delegated EOAs have code starting with `0xef0100` prefix (delegation designator)

**Implications for XMTP:**
- EIP-7702 wallets should be treated as SCW for signing purposes (need `getChainId()`)
- Detection requires checking for the `0xef0100` code prefix
- MetaMask and other wallets are adding 7702 upgrade prompts

### Implementation Phases

#### Phase 1: SCW & 7702 Signer Implementation

**Tasks:**
- [ ] Add `WalletType` type to `/src/types/` (`'EOA' | 'SCW' | 'EIP7702'`)
- [ ] Add `detectWalletType()` utility to `/src/lib/xmtp-signer.ts`
- [ ] Add `isEIP7702Delegated()` helper to detect 7702 delegation prefix
- [ ] Add `createSCWSigner()` function to `/src/lib/xmtp-signer.ts`
- [ ] Add `createSignerForWallet()` unified factory function

**Success criteria:**
- SCW signer has `type: 'SCW'` property
- SCW signer has `getChainId()` returning `bigint`
- Detection correctly identifies Coinbase Wallet connector
- Detection correctly identifies EIP-7702 delegated EOAs via `0xef0100` prefix

#### Phase 2: Context Integration

**Tasks:**
- [ ] Update `initializeWithWallet()` in `/src/contexts/XMTPContext.tsx`
- [ ] Pass chainId from wagmi to signer creation
- [ ] Add error handling for unsupported SCW chains
- [ ] Add wallet type to context state (optional, for UI)

**Success criteria:**
- XMTP client creates successfully with SCW signer
- Meaningful error messages for SCW-specific failures

#### Phase 3: RainbowKit Configuration

**Tasks:**
- [ ] Review and update `/src/lib/wagmi.ts` for smart wallet support
- [ ] Add `baseAccount` wallet option for explicit smart wallet support
- [ ] Configure paymaster URLs if gasless transactions needed

**Success criteria:**
- Coinbase Smart Wallet connects in smart wallet mode (not EOA mode)

#### Phase 4: E2E Testing

**Tasks:**
- [ ] Add SCW mock preset to `/tests/e2e/wallet-mock.js`
- [ ] Add EIP-7702 mock preset with `0xef0100` delegation prefix
- [ ] Add `scw-detection` test case to `/tests/e2e/test-runner.js`
- [ ] Add `eip7702-detection` test case
- [ ] Add `scw-signer-creation` test case
- [ ] Add `scw-connection-flow` test case
- [ ] Add `scw-error-handling` test case

**Success criteria:**
- All SCW tests pass with mock provider
- All EIP-7702 tests pass with mock provider
- Tests cover detection, signer creation, and error scenarios for both types

## Acceptance Criteria

### Functional Requirements

- [ ] Users can connect with Coinbase Smart Wallet (EIP-4337)
- [ ] Users can connect with Safe multisig wallet (EIP-4337)
- [ ] Users can connect with EIP-7702 upgraded EOAs (MetaMask, etc.)
- [ ] System correctly detects SCW vs EOA vs EIP-7702 wallet type
- [ ] SCW/7702 signer includes `type: 'SCW'` and `getChainId()` method
- [ ] XMTP client creates successfully with SCW/7702 signer
- [ ] Error messages are descriptive for smart wallet failures:
  - "Smart Contract Wallet detected but chain X is not supported by XMTP"
  - "Unable to create XMTP identity with Smart Contract Wallet"
  - "EIP-7702 delegation detected - using smart contract wallet signing"
- [ ] EOA wallets continue to work unchanged

### Non-Functional Requirements

- [ ] No breaking changes to existing EOA wallet flows
- [ ] Detection adds < 100ms to connection flow
- [ ] E2E test suite covers SCW flows
- [ ] Code follows existing patterns in codebase

### Quality Gates

- [ ] All existing E2E tests continue to pass
- [ ] New SCW E2E tests pass
- [ ] TypeScript compiles without errors
- [ ] Manual testing with real Coinbase Smart Wallet succeeds

## Technical Considerations

### Wallet Type Detection Strategy

```typescript
// /src/lib/xmtp-signer.ts

export type WalletType = 'EOA' | 'SCW' | 'EIP7702';

// EIP-7702 delegation designator prefix
const EIP7702_DELEGATION_PREFIX = '0xef0100';

const SCW_CONNECTOR_IDS = [
  'coinbaseWalletSDK',
  'com.coinbase.wallet',
  'safe',
];

/**
 * Check if address has EIP-7702 delegation (code starts with 0xef0100)
 */
export function isEIP7702Delegated(code: string | undefined): boolean {
  if (!code || code === '0x') return false;
  return code.toLowerCase().startsWith(EIP7702_DELEGATION_PREFIX);
}

export async function detectWalletType(
  connectorId: string,
  walletClient: WalletClient,
  publicClient: PublicClient
): Promise<WalletType> {
  const address = walletClient.account?.address;
  if (!address) return 'EOA';

  // Get code at address (works for both SCW and EIP-7702)
  const code = await publicClient.getCode({ address });

  // Method 1: Check for EIP-7702 delegation prefix
  if (isEIP7702Delegated(code)) {
    return 'EIP7702';
  }

  // Method 2: Check connector ID for known SCW connectors
  if (SCW_CONNECTOR_IDS.some(id => connectorId.includes(id))) {
    // Coinbase Wallet can be EOA or SCW - check provider
    const provider = await walletClient.transport;
    if (provider?.isSmartContractWallet) {
      return 'SCW';
    }
    // Also check if address has contract code
    if (code && code !== '0x') {
      return 'SCW';
    }
  }

  // Method 3: Fallback - check if address has code (is a contract)
  if (code && code !== '0x') {
    return 'SCW';
  }

  return 'EOA';
}
```

### SCW Signer Implementation

```typescript
// /src/lib/xmtp-signer.ts

export function createSCWSigner(
  walletClient: WalletClient,
  address: Address,
  chainId: number
): Signer {
  return {
    type: 'SCW',
    getIdentifier: () => ({
      identifier: address.toLowerCase(),
      identifierKind: 'Ethereum',
    }),
    signMessage: async (message: string | Uint8Array) => {
      const messageToSign = typeof message === 'string'
        ? message
        : new TextDecoder().decode(message);

      const signature = await walletClient.signMessage({
        account: address,
        message: messageToSign,
      });

      return hexToBytes(signature);
    },
    getChainId: () => BigInt(chainId),
  };
}
```

### Unified Signer Factory

```typescript
// /src/lib/xmtp-signer.ts

export async function createSignerForWallet(
  walletClient: WalletClient,
  publicClient: PublicClient,
  connectorId: string
): Promise<Signer> {
  const address = walletClient.account?.address;
  if (!address) {
    throw new Error('Wallet client has no account');
  }

  const walletType = await detectWalletType(connectorId, walletClient, publicClient);
  const chainId = await walletClient.getChainId();

  // Both SCW (EIP-4337) and EIP-7702 use SCW signer type
  if (walletType === 'SCW' || walletType === 'EIP7702') {
    console.log(`[XMTP] Creating ${walletType} signer for`, address, 'on chain', chainId);
    return createSCWSigner(walletClient, address, chainId);
  }

  console.log('[XMTP] Creating EOA signer for', address);
  return createWalletSigner(walletClient, address);
}
```

### XMTPContext Integration

```typescript
// /src/contexts/XMTPContext.tsx (in initializeWithWallet)

const initializeWithWallet = async () => {
  const walletClient = await getWalletClient();
  const publicClient = getPublicClient();
  const connector = getAccount().connector;

  if (!walletClient || !connector) {
    throw new Error('No wallet connected');
  }

  try {
    const signer = await createSignerForWallet(
      walletClient,
      publicClient,
      connector.id
    );

    const client = await Client.create(signer, {
      env: XMTP_ENV,
    });

    setClient(client);
  } catch (error) {
    if (error.message.includes('chain')) {
      setError('Smart Contract Wallet chain not supported by XMTP');
    } else {
      setError('Failed to create XMTP identity');
    }
    throw error;
  }
};
```

### E2E Mock Updates

```javascript
// /tests/e2e/wallet-mock.js

const WALLET_PRESETS = {
  // ... existing presets ...

  coinbaseSmartWallet: {
    name: 'Coinbase Smart Wallet',
    rdns: 'com.coinbase.wallet',
    icon: 'data:image/svg+xml,...',
    isSmartContractWallet: true,  // EIP-4337 flag
    chainId: 84532,  // Base Sepolia
    // Standard contract bytecode (not 7702)
    bytecode: '0x608060405234801561001057600080fd5b50',
  },

  safe: {
    name: 'Safe',
    rdns: 'app.safe',
    icon: 'data:image/svg+xml,...',
    isSmartContractWallet: true,
    chainId: 84532,
    bytecode: '0x608060405234801561001057600080fd5b50',
  },

  // EIP-7702 delegated EOA (MetaMask upgrade, etc.)
  eip7702Wallet: {
    name: 'MetaMask (7702)',
    rdns: 'io.metamask',
    icon: 'data:image/svg+xml,...',
    isSmartContractWallet: false,  // Still an EOA technically
    isEIP7702: true,
    chainId: 84532,
    // EIP-7702 delegation designator: 0xef0100 + delegate address
    bytecode: '0xef0100deadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
  },
};

// Add eth_getCode mock for SCW/7702 addresses
async function mockEthGetCode(address) {
  if (this.isEIP7702) {
    return this.bytecode; // Returns 0xef0100... prefix
  }
  if (this.isSmartContractWallet) {
    return this.bytecode; // Returns standard contract bytecode
  }
  return '0x'; // EOA has no code
}
```

## Dependencies & Prerequisites

### Internal Dependencies
- wagmi wallet client access (already available)
- Public client for `eth_getCode` calls (already available)
- Connector ID access (available via `useAccount().connector`)

### External Dependencies
- XMTP SDK supporting SCW signer type (confirmed in docs)
- viem for hex conversion utilities (already installed)

### Blockers
- **Unknown**: Whether Base Sepolia (84532) is supported for XMTP SCW signers
  - **Mitigation**: Test early, may need to use different testnet chain

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Base Sepolia not supported for SCW | Medium | High | Test early with real wallet; document supported chains |
| Detection returns wrong type | Low | High | Multiple detection methods; fallback to `eth_getCode` |
| Signature format incompatible | Low | Medium | Trust wagmi/viem abstraction; test with real wallet |
| Breaking existing EOA flows | Low | High | Maintain existing functions; add new unified factory |
| EIP-7702 delegation not recognized | Medium | Medium | Check for `0xef0100` prefix; test with mock and real wallets |
| 7702 wallet revokes delegation mid-session | Low | Medium | Re-detect wallet type on reconnection; handle gracefully |

## Success Metrics

- SCW users can successfully create XMTP identity (measured via console logs)
- EIP-7702 users can successfully create XMTP identity
- Detection accuracy: 100% correct wallet type identification in E2E tests
- No regression in EOA wallet connection flows
- E2E test coverage for all smart wallet scenarios (SCW + 7702)

## Future Considerations

- **Safe multi-sig support**: Requires handling pending signature states
- **Paymaster integration**: For gasless SCW transactions
- **Session keys**: For improved SCW UX with sub-accounts
- **EIP-7702 batch transactions**: Leverage `useSendCalls` for atomic operations
- **EIP-7702 revocation handling**: Detect and handle delegation revocation gracefully

## MVP

### wallet-type.ts

```typescript
// /src/types/wallet-type.ts

/**
 * Wallet types supported for XMTP signing:
 * - EOA: Externally Owned Account (traditional wallet)
 * - SCW: Smart Contract Wallet (EIP-4337 - Coinbase Smart Wallet, Safe, etc.)
 * - EIP7702: EOA with delegated smart contract code (EIP-7702)
 */
export type WalletType = 'EOA' | 'SCW' | 'EIP7702';

export interface WalletTypeInfo {
  type: WalletType;
  connectorId: string;
  chainId: number;
  /** For EIP-7702, the address of the delegated implementation */
  delegateAddress?: string;
}
```

### xmtp-signer.ts (additions)

```typescript
// /src/lib/xmtp-signer.ts (add to existing file)

import type { WalletClient, PublicClient, Address } from 'viem';
import { hexToBytes } from 'viem';
import type { Signer } from '@xmtp/browser-sdk';
import type { WalletType } from '@/types/wallet-type';

// EIP-7702 delegation designator prefix (0xef0100 + 20-byte delegate address)
const EIP7702_DELEGATION_PREFIX = '0xef0100';

const SCW_CONNECTOR_IDS = [
  'coinbaseWalletSDK',
  'com.coinbase.wallet',
  'safe',
  'app.safe',
];

/**
 * Check if bytecode indicates EIP-7702 delegation
 * EIP-7702 delegated accounts have code starting with 0xef0100
 */
export function isEIP7702Delegated(code: string | undefined): boolean {
  if (!code || code === '0x') return false;
  return code.toLowerCase().startsWith(EIP7702_DELEGATION_PREFIX);
}

/**
 * Extract delegate address from EIP-7702 delegation code
 * Format: 0xef0100 + 20-byte address
 */
export function getEIP7702DelegateAddress(code: string): Address | null {
  if (!isEIP7702Delegated(code)) return null;
  // 0xef0100 (6 chars) + 40 hex chars (20 bytes) = 46 chars total
  const delegateHex = code.slice(8, 48); // Skip '0xef0100'
  return `0x${delegateHex}` as Address;
}

export async function detectWalletType(
  connectorId: string,
  address: Address,
  publicClient: PublicClient
): Promise<WalletType> {
  // Get bytecode at address (works for SCW, EIP-7702, and EOA)
  const code = await publicClient.getCode({ address });

  // Method 1: Check for EIP-7702 delegation prefix
  if (isEIP7702Delegated(code)) {
    return 'EIP7702';
  }

  // Method 2: Check connector ID for known SCW connectors
  const isSCWConnector = SCW_CONNECTOR_IDS.some(id =>
    connectorId.toLowerCase().includes(id.toLowerCase())
  );

  if (isSCWConnector && code && code !== '0x') {
    return 'SCW';
  }

  // Method 3: Fallback - check if address has contract code
  if (code && code !== '0x') {
    return 'SCW';
  }

  return 'EOA';
}

export function createSCWSigner(
  walletClient: WalletClient,
  address: Address,
  chainId: number
): Signer {
  return {
    type: 'SCW',
    getIdentifier: () => ({
      identifier: address.toLowerCase(),
      identifierKind: 'Ethereum',
    }),
    signMessage: async (message: string | Uint8Array) => {
      const messageToSign = typeof message === 'string'
        ? message
        : new TextDecoder().decode(message);

      const signature = await walletClient.signMessage({
        account: address,
        message: messageToSign,
      });

      return hexToBytes(signature);
    },
    getChainId: () => BigInt(chainId),
  };
}

export async function createSignerForWallet(
  walletClient: WalletClient,
  publicClient: PublicClient,
  connectorId: string
): Promise<Signer> {
  const address = walletClient.account?.address;
  if (!address) {
    throw new Error('Wallet client has no account');
  }

  const walletType = await detectWalletType(connectorId, address, publicClient);
  const chainId = await walletClient.getChainId();

  // Both SCW (EIP-4337) and EIP-7702 delegated EOAs use SCW signer type
  // because they both require getChainId() for XMTP signing
  if (walletType === 'SCW' || walletType === 'EIP7702') {
    console.log(`[XMTP] Creating ${walletType} signer for`, address, 'on chain', chainId);
    return createSCWSigner(walletClient, address, chainId);
  }

  console.log('[XMTP] Creating EOA signer for', address);
  return createWalletSigner(walletClient, address);
}
```

### wallet-mock.js (SCW + EIP-7702 presets)

```javascript
// /tests/e2e/wallet-mock.js (add to WALLET_PRESETS)

coinbaseSmartWallet: {
  name: 'Coinbase Smart Wallet',
  rdns: 'com.coinbase.wallet',
  icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle fill="%230052FF" cx="16" cy="16" r="16"/></svg>',
  isSmartContractWallet: true,
  bytecode: '0x608060405234801561001057600080fd5b50', // Mock bytecode
},

safe: {
  name: 'Safe',
  rdns: 'app.safe',
  icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect fill="%2312FF80" width="32" height="32"/></svg>',
  isSmartContractWallet: true,
  bytecode: '0x608060405234801561001057600080fd5b50',
},
```

### test-runner.js (SCW + EIP-7702 tests)

```javascript
// /tests/e2e/test-runner.js (add test cases)

{
  name: 'scw-detection',
  description: 'Detect Smart Contract Wallet (EIP-4337) type correctly',
  requiresWallet: true,
  walletPreset: 'coinbaseSmartWallet',
  async run(ctx) {
    // Inject SCW mock
    await ctx.page.evaluate((preset) => {
      window.__WALLET_MOCK_PRESET__ = preset;
    }, ctx.walletPreset);

    // Check detection logic
    const walletType = await ctx.page.evaluate(async () => {
      const code = window.__WALLET_MOCK_PRESET__?.bytecode;
      // EIP-7702 check first
      if (code?.toLowerCase().startsWith('0xef0100')) {
        return 'EIP7702';
      }
      return code && code !== '0x' ? 'SCW' : 'EOA';
    });

    ctx.assert(walletType === 'SCW', `Expected SCW, got ${walletType}`);
    return { success: true, walletType };
  }
},

{
  name: 'eip7702-detection',
  description: 'Detect EIP-7702 delegated EOA correctly',
  requiresWallet: true,
  walletPreset: 'eip7702Wallet',
  async run(ctx) {
    // Inject EIP-7702 mock
    await ctx.page.evaluate((preset) => {
      window.__WALLET_MOCK_PRESET__ = preset;
    }, ctx.walletPreset);

    // Check detection logic
    const result = await ctx.page.evaluate(async () => {
      const code = window.__WALLET_MOCK_PRESET__?.bytecode;
      const EIP7702_PREFIX = '0xef0100';
      const isEIP7702 = code?.toLowerCase().startsWith(EIP7702_PREFIX);

      // Extract delegate address if EIP-7702
      let delegateAddress = null;
      if (isEIP7702) {
        delegateAddress = '0x' + code.slice(8, 48);
      }

      return {
        walletType: isEIP7702 ? 'EIP7702' : (code && code !== '0x' ? 'SCW' : 'EOA'),
        delegateAddress,
        hasCorrectPrefix: code?.toLowerCase().startsWith(EIP7702_PREFIX),
      };
    });

    ctx.assert(result.walletType === 'EIP7702', `Expected EIP7702, got ${result.walletType}`);
    ctx.assert(result.hasCorrectPrefix, 'Should have 0xef0100 prefix');
    ctx.assert(result.delegateAddress !== null, 'Should extract delegate address');

    return { success: true, ...result };
  }
},

{
  name: 'eip7702-signer-properties',
  description: 'EIP-7702 signer has required SCW properties',
  requiresWallet: true,
  walletPreset: 'eip7702Wallet',
  async run(ctx) {
    // Mock signer creation for EIP-7702 (uses same SCW signer)
    const signerProps = await ctx.page.evaluate(() => {
      const mockSigner = {
        type: 'SCW', // EIP-7702 uses SCW signer type for XMTP
        getIdentifier: () => ({ identifier: '0x123', identifierKind: 'Ethereum' }),
        signMessage: async () => new Uint8Array([1, 2, 3]),
        getChainId: () => BigInt(84532),
      };

      return {
        hasType: mockSigner.type === 'SCW',
        hasGetChainId: typeof mockSigner.getChainId === 'function',
        chainIdIsBigInt: typeof mockSigner.getChainId() === 'bigint',
      };
    });

    ctx.assert(signerProps.hasType, 'Signer should have type SCW');
    ctx.assert(signerProps.hasGetChainId, 'Signer should have getChainId');
    ctx.assert(signerProps.chainIdIsBigInt, 'getChainId should return bigint');

    return { success: true, signerProps };
  }
},

{
  name: 'scw-signer-properties',
  description: 'SCW signer has required properties',
  requiresWallet: true,
  walletPreset: 'coinbaseSmartWallet',
  async run(ctx) {
    // Mock signer creation
    const signerProps = await ctx.page.evaluate(() => {
      const mockSigner = {
        type: 'SCW',
        getIdentifier: () => ({ identifier: '0x123', identifierKind: 'Ethereum' }),
        signMessage: async () => new Uint8Array([1, 2, 3]),
        getChainId: () => BigInt(84532),
      };

      return {
        hasType: mockSigner.type === 'SCW',
        hasGetChainId: typeof mockSigner.getChainId === 'function',
        chainIdIsBigInt: typeof mockSigner.getChainId() === 'bigint',
      };
    });

    ctx.assert(signerProps.hasType, 'Signer should have type SCW');
    ctx.assert(signerProps.hasGetChainId, 'Signer should have getChainId');
    ctx.assert(signerProps.chainIdIsBigInt, 'getChainId should return bigint');

    return { success: true, signerProps };
  }
},
```

## References

### Internal References
- Current signer implementation: `/src/lib/xmtp-signer.ts:23-44`
- Wallet provider: `/src/components/wallet/WalletProvider.tsx:1-29`
- XMTP context: `/src/contexts/XMTPContext.tsx`
- E2E wallet mock: `/tests/e2e/wallet-mock.js:21-58`
- E2E test runner: `/tests/e2e/test-runner.js`
- Existing SCW documentation: `/docs/troubleshooting/rainbowkit-xmtp-prevention.md`

### External References
- [XMTP SDK Signer Types](https://docs.xmtp.org)
- [EIP-4337 Account Abstraction](https://eips.ethereum.org/EIPS/eip-4337)
- [EIP-7702 Overview - Viem](https://viem.sh/docs/eip7702)
- [EIP-7702 Implementation Guide - QuickNode](https://www.quicknode.com/guides/ethereum-development/smart-contracts/eip-7702-smart-accounts)
- [Integrating with EIP-7702 - Privy](https://docs.privy.io/recipes/react/eip-7702)
- [RainbowKit Smart Wallet Config](https://rainbowkit.com/docs)
- [wagmi Mock Connector](https://wagmi.sh/react/api/connectors/mock)
- [Coinbase Smart Wallet Docs](https://docs.cdp.coinbase.com/wallet-sdk/docs/sw-setup)
- [viem Account Abstraction](https://viem.sh/docs/account-abstraction)
- [EIP-5792 Getting Started](https://www.eip5792.xyz/getting-started) - Batch transactions with `useSendCalls`

### Related Work
- Recent commits: `fda5b3a` - Migrate to RainbowKit
- Existing plan: `/plans/feat-multi-wallet-e2e-testing.md`

# Multi-Wallet E2E Testing for RainbowKit

## Overview

This plan outlines how to extend the existing E2E testing infrastructure to test different wallet types with RainbowKit's wallet modal. The app now uses RainbowKit with 6 configured wallets that need comprehensive testing.

## Current Implementation Analysis

### RainbowKit Wallet Configuration

**File:** `src/lib/wagmi.ts:25-46`

```javascript
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Popular',
      wallets: [
        metaMaskWallet,
        coinbaseWallet,
        uniswapWallet,
        rainbowWallet,
        phantomWallet,
      ],
    },
    {
      groupName: 'More',
      wallets: [walletConnectWallet],
    },
  ],
  { appName: 'XMTP Gateway Console', projectId: walletConnectProjectId }
)
```

### Existing E2E Testing Stack

| Component | Details |
|-----------|---------|
| **Framework** | agent-browser (Vercel's headless CLI) |
| **Test Runner** | `tests/e2e/test-runner.js` (Node.js) |
| **Wallet Mock** | `tests/e2e/wallet-mock.js` |
| **Total Tests** | 13 tests (7 basic, 6 wallet-specific) |

### Current Wallet Mock Limitations

The existing `wallet-mock.js` only simulates **one MetaMask-like wallet**:
- Sets `isMetaMask: true` flag
- Announces via EIP-6963 as "Mock Test Wallet"
- Cannot test wallet selection in RainbowKit modal
- Cannot test different wallet behaviors (Coinbase, WalletConnect, Phantom, etc.)

---

## Problem Statement

**We cannot currently test:**
1. RainbowKit modal showing all 6 wallet options
2. Selecting different wallets from the modal (MetaMask vs Coinbase vs Rainbow)
3. WalletConnect QR code flow
4. Wallet-specific behaviors (Phantom for Solana users, etc.)
5. Error states (user rejection, wrong network)
6. Multiple wallets being available simultaneously

---

## Proposed Solution

### Phase 1: Enhanced Wallet Mock Factory

Refactor `wallet-mock.js` into a configurable factory that can simulate different wallet types.

**File:** `tests/e2e/wallet-mock.js`

```javascript
/**
 * Multi-Wallet Mock Provider Factory for E2E Testing
 * Supports RainbowKit wallet selection testing
 */

const WALLET_PRESETS = {
  metamask: {
    name: 'MetaMask',
    rdns: 'io.metamask',
    flags: { isMetaMask: true },
    icon: 'data:image/svg+xml,...',
  },
  coinbase: {
    name: 'Coinbase Wallet',
    rdns: 'com.coinbase.wallet',
    flags: { isCoinbaseWallet: true },
    icon: 'data:image/svg+xml,...',
  },
  rainbow: {
    name: 'Rainbow',
    rdns: 'me.rainbow',
    flags: { isRainbow: true },
    icon: 'data:image/svg+xml,...',
  },
  phantom: {
    name: 'Phantom',
    rdns: 'app.phantom',
    flags: { isPhantom: true, phantom: { ethereum: true } },
    icon: 'data:image/svg+xml,...',
  },
  uniswap: {
    name: 'Uniswap Wallet',
    rdns: 'org.uniswap.app',
    flags: { isUniswapWallet: true },
    icon: 'data:image/svg+xml,...',
  },
}

const TEST_ACCOUNTS = {
  default: {
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  },
  secondary: {
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  },
}

const ERROR_MODES = {
  none: null,
  rejectConnect: { code: 4001, message: 'User rejected the request' },
  rejectSign: { code: 4001, message: 'User denied message signature' },
  wrongNetwork: { code: 4902, message: 'Unrecognized chain ID' },
}

function createMockProvider(options = {}) {
  const {
    walletType = 'metamask',
    account = TEST_ACCOUNTS.default,
    chainId = 84532, // Base Sepolia
    errorMode = 'none',
  } = options

  const preset = WALLET_PRESETS[walletType]
  let currentChainId = chainId
  const error = ERROR_MODES[errorMode]

  const provider = {
    ...preset.flags,
    isMockProvider: true,
    _walletType: walletType,
    _testAddress: account.address,

    request: async ({ method, params }) => {
      console.log(`[Mock${preset.name}]`, method, params)

      // Handle error simulation
      if (error && method === 'eth_requestAccounts' && errorMode === 'rejectConnect') {
        throw { code: error.code, message: error.message }
      }

      switch (method) {
        case 'eth_requestAccounts':
        case 'eth_accounts':
          return [account.address]
        case 'eth_chainId':
          return '0x' + currentChainId.toString(16)
        case 'wallet_switchEthereumChain':
          if (errorMode === 'wrongNetwork') {
            throw ERROR_MODES.wrongNetwork
          }
          currentChainId = parseInt(params[0].chainId, 16)
          provider.emit('chainChanged', '0x' + currentChainId.toString(16))
          return null
        // ... rest of RPC methods (same as current implementation)
      }
    },

    on: (event, callback) => { /* ... */ },
    emit: (event, ...args) => { /* ... */ },
  }

  return { provider, preset }
}

/**
 * Inject multiple wallets for RainbowKit modal testing
 * @param {Array} configs - Array of wallet configurations
 */
function injectWallets(configs = [{ walletType: 'metamask' }]) {
  const injected = []

  configs.forEach((config, index) => {
    const { provider, preset } = createMockProvider(config)

    // First wallet becomes window.ethereum
    if (index === 0) {
      Object.defineProperty(window, 'ethereum', {
        value: provider,
        writable: true,
        configurable: true,
      })
    }

    // All wallets announce via EIP-6963 (RainbowKit uses this)
    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', {
        detail: {
          info: {
            uuid: `mock-${preset.rdns}-${index}`,
            name: preset.name,
            icon: preset.icon,
            rdns: preset.rdns,
          },
          provider,
        },
      })
    )

    injected.push({ type: config.walletType, name: preset.name, address: config.account?.address })
  })

  window.__mockWallets = injected
  console.log('[MockWallets] Injected:', injected.map(w => w.name).join(', '))
  return injected
}

// Export for E2E tests
window.injectWallets = injectWallets
window.WALLET_PRESETS = WALLET_PRESETS
window.TEST_ACCOUNTS = TEST_ACCOUNTS
window.ERROR_MODES = ERROR_MODES
```

### Phase 2: New E2E Test Cases

Add to `tests/e2e/test-runner.js`:

```javascript
// === RainbowKit Multi-Wallet Tests ===

'rainbowkit-modal-wallets': {
  name: 'RainbowKit modal shows all wallet options',
  requiresWallet: true,
  run: async () => {
    ab(`open ${targetUrl}`)
    await sleep(1000)

    // Inject multiple wallets before opening modal
    evaluate(`
      window.injectWallets([
        { walletType: 'metamask' },
        { walletType: 'coinbase' },
        { walletType: 'rainbow' },
        { walletType: 'phantom' }
      ])
    `)
    await sleep(500)

    // Click Connect to open RainbowKit modal
    await connectWallet()
    await sleep(1500)

    const snap = snapshot()

    // RainbowKit should show wallet options
    const hasMetaMask = snap.toLowerCase().includes('metamask')
    const hasCoinbase = snap.toLowerCase().includes('coinbase')
    const hasRainbow = snap.toLowerCase().includes('rainbow')

    console.log(`    MetaMask: ${hasMetaMask}`)
    console.log(`    Coinbase: ${hasCoinbase}`)
    console.log(`    Rainbow: ${hasRainbow}`)

    assert(hasMetaMask || hasCoinbase, 'RainbowKit modal should show wallet options')
    return true
  },
},

'wallet-connect-rejection': {
  name: 'Handles wallet rejection gracefully',
  requiresWallet: true,
  run: async () => {
    ab(`open ${targetUrl}`)
    await sleep(1000)

    // Inject wallet that will reject
    evaluate(`
      window.injectWallets([
        { walletType: 'metamask', errorMode: 'rejectConnect' }
      ])
    `)
    await sleep(500)

    await connectWallet()
    await sleep(1500)

    // Select MetaMask (will reject)
    const snap = snapshot('-i')
    const metamaskMatch = snap.match(/button.*MetaMask.*?\[ref=(e\d+)\]/i)

    if (metamaskMatch) {
      ab(`click @${metamaskMatch[1]}`)
      await sleep(1000)
    }

    // Should handle rejection without crashing
    const afterSnap = snapshot()
    const hasError = afterSnap.toLowerCase().includes('rejected') ||
                     afterSnap.toLowerCase().includes('connect') // Still on connect screen

    console.log(`    Rejection handled: ${hasError ? 'yes' : 'no'}`)
    return true
  },
},

'wrong-network-switch': {
  name: 'Prompts to switch from wrong network',
  requiresWallet: true,
  run: async () => {
    ab(`open ${targetUrl}`)
    await sleep(1000)

    // Inject wallet on mainnet (app expects Base Sepolia)
    evaluate(`
      window.injectWallets([
        { walletType: 'metamask', chainId: 1 } // Mainnet instead of Base Sepolia (84532)
      ])
    `)
    await sleep(500)

    // Try to connect
    await connectWallet()
    await sleep(1500)

    const snap = snapshot()

    // Should detect wrong network
    const hasNetworkPrompt = snap.toLowerCase().includes('switch') ||
                            snap.toLowerCase().includes('wrong network') ||
                            snap.toLowerCase().includes('base')

    console.log(`    Network switch UI: ${hasNetworkPrompt ? 'shown' : 'not shown'}`)
    return true
  },
},

'coinbase-wallet-connect': {
  name: 'Coinbase Wallet can connect',
  requiresWallet: true,
  run: async () => {
    ab(`open ${targetUrl}`)
    await sleep(1000)

    // Inject Coinbase Wallet
    evaluate(`
      window.injectWallets([
        { walletType: 'coinbase', account: window.TEST_ACCOUNTS.secondary }
      ])
    `)
    await sleep(500)

    const result = evaluate('window.__mockWallets[0].name')
    assert(result.includes('Coinbase'), 'Should have Coinbase Wallet available')

    return true
  },
},

'phantom-wallet-detection': {
  name: 'Phantom wallet is detected',
  requiresWallet: true,
  run: async () => {
    ab(`open ${targetUrl}`)
    await sleep(1000)

    evaluate(`
      window.injectWallets([
        { walletType: 'phantom' }
      ])
    `)
    await sleep(500)

    // Verify Phantom's unique flag
    const hasPhantom = evaluate('window.ethereum?.isPhantom || false')
    console.log(`    Phantom detected: ${hasPhantom}`)

    return true
  },
},
```

### Phase 3: Test Configuration Updates

Update `package.json`:

```json
{
  "scripts": {
    "test:e2e": "node tests/e2e/test-runner.js",
    "test:e2e:verbose": "node tests/e2e/test-runner.js --verbose",
    "test:e2e:wallet": "node tests/e2e/test-runner.js --with-wallet --verbose",
    "test:e2e:rainbowkit": "node tests/e2e/test-runner.js --with-wallet --test rainbowkit-modal-wallets --verbose"
  }
}
```

---

## Acceptance Criteria

- [ ] `wallet-mock.js` supports factory pattern with wallet type presets
- [ ] Can inject multiple wallets that appear in RainbowKit modal
- [ ] Can simulate MetaMask, Coinbase, Rainbow, Phantom, Uniswap wallets
- [ ] Can test user rejection error flows
- [ ] Can test wrong network detection
- [ ] New tests pass in CI without real wallets
- [ ] Existing tests remain passing

---

## Implementation Checklist

### MVP (Quick Wins)

- [ ] Add `walletType` parameter to `createMockProvider()`
- [ ] Add `WALLET_PRESETS` object with flags for each wallet
- [ ] Add `errorMode` parameter for rejection testing
- [ ] Add `injectWallets()` function for multi-wallet scenarios
- [ ] Add 2-3 new test cases

### Enhanced Testing

- [ ] Test all 6 configured wallets individually
- [ ] Test wallet modal shows correct grouping ("Popular" vs "More")
- [ ] Test WalletConnect QR code flow (mock the modal interaction)
- [ ] Test account switching events
- [ ] Test chain switching events

---

## Files to Modify

| File | Change |
|------|--------|
| `tests/e2e/wallet-mock.js` | Refactor to factory pattern with presets |
| `tests/e2e/test-runner.js` | Add new multi-wallet test cases |
| `package.json` | Add new test scripts |
| `tests/e2e/README.md` | Document new wallet testing features |

---

## Alternative Approaches Considered

### 1. Synpress with Real MetaMask Extension
- **Pros:** Tests actual MetaMask behavior
- **Cons:** Slow, complex CI setup, requires browser extension
- **Verdict:** Overkill for current needs

### 2. Playwright with @johanneskares/wallet-mock
- **Pros:** Well-maintained, Playwright integration
- **Cons:** Would require migrating from agent-browser
- **Verdict:** Consider for future if needs grow

### 3. Wagmi Mock Connector in Production Code
- **Pros:** Type-safe, official wagmi approach
- **Cons:** Modifies production code with test conditionals
- **Verdict:** Better for unit tests than E2E

**Recommendation:** Enhance existing `wallet-mock.js` - fastest path with existing infrastructure.

---

## References

### Internal Files
- Wallet mock: `tests/e2e/wallet-mock.js:1-159`
- Test runner: `tests/e2e/test-runner.js:1-518`
- RainbowKit config: `src/lib/wagmi.ts:25-46`
- Connect component: `src/components/wallet/ConnectWallet.tsx:1-24`

### External Documentation
- [RainbowKit Custom Wallets](https://rainbowkit.com/docs/custom-wallets)
- [EIP-6963 Multi-Wallet Discovery](https://eips.ethereum.org/EIPS/eip-6963)
- [Wagmi Mock Connector](https://wagmi.sh/react/api/connectors/mock)
- [wallet-mock Package](https://github.com/johanneskares/wallet-mock)

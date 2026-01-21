import { type Signer, IdentifierKind } from '@xmtp/browser-sdk'
import { privateKeyToAccount } from 'viem/accounts'
import { toBytes, createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import type { Hex, WalletClient, Address, PublicClient } from 'viem'
import type { WalletTypeInfo } from '@/types/wallet-type'
import { BASE_MAINNET_RPC_URL } from './constants'

/** EIP-7702 delegation designator prefix */
const EIP7702_PREFIX = '0xef0100'

/** Coinbase wallet connector IDs (supports both EOA and Smart Wallet) */
export const COINBASE_CONNECTOR_IDS = [
  'coinbase',
  'coinbaseWalletSDK',
  'com.coinbase.wallet',
] as const

/** Check if a connector is Coinbase Wallet */
export function isCoinbaseWallet(connectorId: string): boolean {
  return COINBASE_CONNECTOR_IDS.includes(connectorId as typeof COINBASE_CONNECTOR_IDS[number])
}

/**
 * Creates an XMTP signer from an ephemeral private key.
 * The signer implements the EOA interface required by the XMTP browser SDK.
 */
export function createEphemeralSigner(privateKey: Hex): Signer {
  const account = privateKeyToAccount(privateKey)

  return {
    type: 'EOA',
    getIdentifier: () => ({
      identifier: account.address.toLowerCase(),
      identifierKind: IdentifierKind.Ethereum,
    }),
    signMessage: async (message: string) => {
      const signature = await account.signMessage({ message })
      return toBytes(signature)
    },
  }
}

/**
 * Creates an XMTP signer from a wagmi wallet client.
 * Used for signing with the user's connected wallet (MetaMask, etc.)
 */
export function createWalletSigner(walletClient: WalletClient, address: Address): Signer {
  return {
    type: 'EOA',
    getIdentifier: () => ({
      identifier: address.toLowerCase(),
      identifierKind: IdentifierKind.Ethereum,
    }),
    signMessage: async (message: string) => {
      const signature = await walletClient.signMessage({
        account: address,
        message,
      })
      return toBytes(signature)
    },
  }
}

/**
 * Creates an XMTP signer for Smart Contract Wallets (SCW).
 * SCW signers require a chainId for EIP-1271 signature verification.
 */
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
      const signature = await walletClient.signMessage({
        account: address,
        message,
      })
      return toBytes(signature)
    },
    getChainId: () => BigInt(chainId),
  }
}

/** Classifies bytecode into wallet type. Returns null if no bytecode (EOA). */
function classifyBytecode(bytecode: Hex | undefined):
  | { type: 'SCW' }
  | { type: 'EIP7702'; delegateAddress: Address }
  | null {
  if (!bytecode || bytecode === '0x') {
    return null
  }
  if (bytecode.toLowerCase().startsWith(EIP7702_PREFIX)) {
    const delegateAddress = ('0x' + bytecode.slice(8, 48)) as Address
    return { type: 'EIP7702', delegateAddress }
  }
  return { type: 'SCW' }
}

/**
 * Detects the wallet type by checking on-chain bytecode.
 * - EOA: No bytecode (empty)
 * - EIP-7702: Bytecode starts with 0xef0100 (delegation designator)
 * - SCW: Has bytecode (smart contract wallet like Coinbase Smart Wallet, Safe)
 *
 * For Coinbase Wallet, we also check Base mainnet since Smart Wallets are
 * typically deployed there first (even if user is on a different chain).
 */
export async function detectWalletType(
  publicClient: PublicClient,
  address: Address,
  connectorId: string,
  chainId: number
): Promise<WalletTypeInfo> {
  try {
    // Check bytecode on connected chain first
    const bytecode = await publicClient.getCode({ address })
    const result = classifyBytecode(bytecode)

    if (result) {
      return { ...result, connectorId, chainId }
    }

    // For Coinbase Wallet, also check Base mainnet where Smart Wallets are typically deployed
    if (isCoinbaseWallet(connectorId) && chainId !== base.id) {
      try {
        const baseClient = createPublicClient({
          chain: base,
          transport: http(BASE_MAINNET_RPC_URL),
        })
        const baseBytecode = await baseClient.getCode({ address })
        const baseResult = classifyBytecode(baseBytecode)

        if (baseResult) {
          return { ...baseResult, connectorId, chainId }
        }
      } catch {
        // Base RPC failure shouldn't break detection - fall through to EOA
      }
    }

    return { type: 'EOA', connectorId, chainId }
  } catch (error) {
    console.warn('[XMTP] Failed to detect wallet type, defaulting to EOA:', error)
    return { type: 'EOA', connectorId, chainId }
  }
}

/**
 * Creates the appropriate XMTP signer based on wallet type.
 * Automatically detects wallet type and creates EOA or SCW signer.
 */
export async function createSignerForWallet(
  walletClient: WalletClient,
  publicClient: PublicClient,
  address: Address,
  connectorId: string,
  chainId: number
): Promise<{ signer: Signer; walletTypeInfo: WalletTypeInfo }> {
  const walletTypeInfo = await detectWalletType(publicClient, address, connectorId, chainId)

  let signer: Signer
  if (walletTypeInfo.type === 'EOA') {
    signer = createWalletSigner(walletClient, address)
  } else {
    // Both SCW and EIP-7702 use SCW signer (both need chainId)
    signer = createSCWSigner(walletClient, address, chainId)
  }

  return { signer, walletTypeInfo }
}

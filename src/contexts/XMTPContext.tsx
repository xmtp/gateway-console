import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import { Client, LogLevel } from '@xmtp/browser-sdk'
import { createEphemeralSigner, createSignerForWallet, isCoinbaseWallet } from '@/lib/xmtp-signer'
import { GATEWAY_URL, USE_GATEWAY, XMTP_NETWORK } from '@/lib/constants'
import type { EphemeralUser } from '@/types/user'
import type { WalletTypeInfo } from '@/types/wallet-type'
import type { WalletClient, Address, PublicClient } from 'viem'

// Special ID to identify when the connected wallet is the active user
export const WALLET_USER_ID = '__connected_wallet__'

interface XMTPContextValue {
  client: Client | null
  activeUserId: string | null
  initializeClient: (user: EphemeralUser) => Promise<void>
  initializeWithWallet: (
    walletClient: WalletClient,
    publicClient: PublicClient,
    address: Address,
    connectorId: string,
    chainId: number
  ) => Promise<void>
  disconnect: () => Promise<void>
  isConnecting: boolean
  isLoadingConversations: boolean
  setIsLoadingConversations: (loading: boolean) => void
  error: Error | null
  inboxId: string | null
  walletTypeInfo: WalletTypeInfo | null
}

const XMTPContext = createContext<XMTPContextValue | null>(null)

interface XMTPProviderProps {
  children: ReactNode
}

export function XMTPProvider({ children }: XMTPProviderProps) {
  const [client, setClient] = useState<Client | null>(null)
  const [activeUserId, setActiveUserId] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [inboxId, setInboxId] = useState<string | null>(null)
  const [walletTypeInfo, setWalletTypeInfo] = useState<WalletTypeInfo | null>(null)

  // Track the current client ref for cleanup (avoids stale closure issues)
  const clientRef = useRef<Client | null>(null)

  // Track if we're in the middle of an operation to prevent concurrent calls
  const operationInProgress = useRef(false)

  // Helper to close existing client (OPFS only allows one client at a time)
  const closeExistingClient = useCallback(async () => {
    if (clientRef.current) {
      try {
        await clientRef.current.close()
      } catch (e) {
        console.warn('[XMTP] Error closing previous client:', e)
      }
      clientRef.current = null
      setClient(null)
      // Small delay for OPFS cleanup
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }, [])

  const disconnect = useCallback(async () => {
    if (clientRef.current) {
      try {
        await clientRef.current.close()
      } catch (e) {
        console.warn('[XMTP] Error closing client:', e)
      }
      clientRef.current = null
    }
    setClient(null)
    setActiveUserId(null)
    setInboxId(null)
    setError(null)
    setWalletTypeInfo(null)
  }, [])

  const initializeClient = useCallback(async (user: EphemeralUser) => {
    // Skip if same user already connected
    if (clientRef.current && activeUserId === user.id) {
      return
    }

    // Prevent concurrent initialization
    if (operationInProgress.current) {
      return
    }

    operationInProgress.current = true
    setIsConnecting(true)
    setIsLoadingConversations(true)
    setError(null)

    console.log('[XMTP] Creating client for', user.name, '...')

    try {
      await closeExistingClient()

      const signer = createEphemeralSigner(user.privateKey)
      const dbPath = `xmtp-mwt-${user.id}`

      const newClient = await Client.create(signer, {
        env: 'dev' as const,
        dbPath,
        appVersion: 'xmtp-gateway-console/0.1.0',
        loggingLevel: import.meta.env.DEV ? LogLevel.Debug : LogLevel.Warn,
        // Only pass gatewayHost when network is 'testnet' (routes through gateway)
        ...(USE_GATEWAY && { gatewayHost: GATEWAY_URL }),
      })

      console.log('[XMTP] Client created:', {
        inboxId: newClient.inboxId,
        network: XMTP_NETWORK,
        gateway: USE_GATEWAY ? GATEWAY_URL : 'disabled',
      })

      if (import.meta.env.DEV) {
        (window as unknown as { __XMTP_CLIENT__: Client | null }).__XMTP_CLIENT__ = newClient
      }

      clientRef.current = newClient
      setClient(newClient)
      setActiveUserId(user.id)
      setInboxId(newClient.inboxId ?? null)
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to initialize XMTP client')
      console.error('[XMTP] Client creation failed:', err.message)
      setError(err)
      setClient(null)
      clientRef.current = null
      setActiveUserId(null)
      setInboxId(null)
      setIsLoadingConversations(false)
    } finally {
      setIsConnecting(false)
      operationInProgress.current = false
    }
  }, [activeUserId, closeExistingClient])

  const initializeWithWallet = useCallback(async (
    walletClient: WalletClient,
    publicClient: PublicClient,
    address: Address,
    connectorId: string,
    chainId: number
  ) => {
    // Skip if already connected as wallet
    if (clientRef.current && activeUserId === WALLET_USER_ID) {
      return
    }

    // Prevent concurrent initialization
    if (operationInProgress.current) {
      return
    }

    operationInProgress.current = true
    setIsConnecting(true)
    setIsLoadingConversations(true)
    setError(null)

    console.log('[XMTP] Creating client for wallet', address.slice(0, 10) + '...', '...')

    try {
      await closeExistingClient()

      // Detect wallet type and create appropriate signer
      const { signer, walletTypeInfo: detectedWalletType } = await createSignerForWallet(
        walletClient,
        publicClient,
        address,
        connectorId,
        chainId
      )
      setWalletTypeInfo(detectedWalletType)

      const dbPath = `xmtp-mwt-wallet-${address.toLowerCase()}`

      const newClient = await Client.create(signer, {
        env: 'dev' as const,
        dbPath,
        appVersion: 'xmtp-gateway-console/0.1.0',
        loggingLevel: import.meta.env.DEV ? LogLevel.Debug : LogLevel.Warn,
        // Only pass gatewayHost when network is 'testnet' (routes through gateway)
        ...(USE_GATEWAY && { gatewayHost: GATEWAY_URL }),
      })

      console.log('[XMTP] Client created:', {
        inboxId: newClient.inboxId,
        network: XMTP_NETWORK,
        gateway: USE_GATEWAY ? GATEWAY_URL : 'disabled',
        walletType: detectedWalletType.type,
      })

      if (import.meta.env.DEV) {
        (window as unknown as { __XMTP_CLIENT__: Client | null }).__XMTP_CLIENT__ = newClient
      }

      clientRef.current = newClient
      setClient(newClient)
      setActiveUserId(WALLET_USER_ID)
      setInboxId(newClient.inboxId ?? null)
    } catch (e) {
      const originalError = e instanceof Error ? e : new Error('Failed to initialize XMTP client with wallet')
      console.error('[XMTP] Client creation failed:', originalError.message)

      // Provide more helpful error messages for common SCW issues
      let userFriendlyError = originalError
      const errorMsg = originalError.message.toLowerCase()

      if (errorMsg.includes('signature') && (errorMsg.includes('valid') || errorMsg.includes('verif'))) {
        // SCW signature validation failed - provide helpful context
        console.error('[XMTP] SCW signature validation failed.')
        console.error('  - Connected chain:', chainId)
        console.error('  - Connector:', connectorId)

        if (isCoinbaseWallet(connectorId)) {
          userFriendlyError = new Error(
            'COINBASE_SMART_WALLET_UNSUPPORTED: Coinbase Smart Wallets use passkey signatures which are not yet supported by XMTP outside of the Base app.'
          )
        } else {
          userFriendlyError = new Error(
            `Smart wallet signature verification failed. XMTP may not fully support this wallet type yet. ` +
            `Try using an EOA wallet (like MetaMask) instead.`
          )
        }
      }

      setError(userFriendlyError)
      setClient(null)
      clientRef.current = null
      setActiveUserId(null)
      setInboxId(null)
      setWalletTypeInfo(null)
      setIsLoadingConversations(false)
    } finally {
      setIsConnecting(false)
      operationInProgress.current = false
    }
  }, [activeUserId, closeExistingClient])

  return (
    <XMTPContext.Provider
      value={{
        client,
        activeUserId,
        initializeClient,
        initializeWithWallet,
        disconnect,
        isConnecting,
        isLoadingConversations,
        setIsLoadingConversations,
        error,
        inboxId,
        walletTypeInfo,
      }}
    >
      {children}
    </XMTPContext.Provider>
  )
}

export function useXMTP() {
  const context = useContext(XMTPContext)
  if (!context) {
    throw new Error('useXMTP must be used within an XMTPProvider')
  }
  return context
}

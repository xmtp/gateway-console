import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import { Client, LogLevel } from '@xmtp/browser-sdk'
import { createEphemeralSigner, createWalletSigner } from '@/lib/xmtp-signer'
import type { EphemeralUser } from '@/types/user'
import type { WalletClient, Address } from 'viem'

// Special ID to identify when the connected wallet is the active user
export const WALLET_USER_ID = '__connected_wallet__'

interface XMTPContextValue {
  client: Client | null
  activeUserId: string | null
  initializeClient: (user: EphemeralUser) => Promise<void>
  initializeWithWallet: (walletClient: WalletClient, address: Address) => Promise<void>
  disconnect: () => Promise<void>
  isConnecting: boolean
  isLoadingConversations: boolean
  setIsLoadingConversations: (loading: boolean) => void
  error: Error | null
  inboxId: string | null
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

  // Track the current client ref for cleanup (avoids stale closure issues)
  const clientRef = useRef<Client | null>(null)

  // Track if we're in the middle of an operation to prevent concurrent calls
  const operationInProgress = useRef(false)

  const disconnect = useCallback(async () => {
    console.log('[XMTP] Disconnect called', {
      hasClient: !!clientRef.current,
      inboxId: clientRef.current?.inboxId,
      installationId: clientRef.current?.installationId,
    })

    if (clientRef.current) {
      try {
        await clientRef.current.close()
        console.log('[XMTP] Client closed successfully')
      } catch (e) {
        console.warn('[XMTP] Error closing client:', e)
      }
      clientRef.current = null
    }

    setClient(null)
    setActiveUserId(null)
    setInboxId(null)
    setError(null)
  }, [])

  const initializeClient = useCallback(async (user: EphemeralUser) => {
    console.log('[XMTP] initializeClient called:', {
      requestedUserId: user.id,
      requestedUserName: user.name,
      currentActiveUserId: activeUserId,
      hasExistingClient: !!clientRef.current,
      existingInstallationId: clientRef.current?.installationId,
      operationInProgress: operationInProgress.current,
    })

    // If same user and client exists, no need to reinitialize
    if (clientRef.current && activeUserId === user.id) {
      console.log('[XMTP] Same user already connected, skipping initialization')
      return
    }

    // Prevent concurrent initialization
    if (operationInProgress.current) {
      console.warn('[XMTP] Operation already in progress, skipping')
      return
    }

    operationInProgress.current = true
    setIsConnecting(true)
    setIsLoadingConversations(true)
    setError(null)

    try {
      // IMPORTANT: Close existing client before creating new one
      // OPFS only allows one sync access handle per file at a time
      if (clientRef.current) {
        console.log('[XMTP] Closing existing client before switching users')
        try {
          await clientRef.current.close()
          console.log('[XMTP] Previous client closed')
        } catch (e) {
          console.warn('[XMTP] Error closing previous client:', e)
        }
        clientRef.current = null
        setClient(null)

        // Small delay to ensure OPFS file handle is released
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Create signer from user's private key
      const signer = createEphemeralSigner(user.privateKey)

      // Build consistent database path
      const dbPath = `xmtp-mwt-${user.id}`

      console.log('[XMTP] Initializing client for user:', {
        userId: user.id,
        userName: user.name,
        address: user.address,
        dbPath,
      })

      // Create new XMTP client
      const newClient = await Client.create(signer, {
        env: 'dev' as const,
        dbPath,
        appVersion: 'message-with-tokens/0.1.0',
        loggingLevel: import.meta.env.DEV ? LogLevel.Debug : LogLevel.Warn,
      })

      console.log('[XMTP] Client created:', {
        inboxId: newClient.inboxId,
        installationId: newClient.installationId,
        dbPath,
      })

      // Store in ref for cleanup
      clientRef.current = newClient

      setClient(newClient)
      setActiveUserId(user.id)
      setInboxId(newClient.inboxId ?? null)
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to initialize XMTP client')
      console.error('XMTP initialization error:', err)
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
  }, [activeUserId])

  const initializeWithWallet = useCallback(async (walletClient: WalletClient, address: Address) => {
    console.log('[XMTP] initializeWithWallet called:', {
      address,
      currentActiveUserId: activeUserId,
      hasExistingClient: !!clientRef.current,
      operationInProgress: operationInProgress.current,
    })

    // If already connected as wallet, skip
    if (clientRef.current && activeUserId === WALLET_USER_ID) {
      console.log('[XMTP] Already connected as wallet, skipping')
      return
    }

    // Prevent concurrent initialization
    if (operationInProgress.current) {
      console.warn('[XMTP] Operation already in progress, skipping')
      return
    }

    operationInProgress.current = true
    setIsConnecting(true)
    setIsLoadingConversations(true)
    setError(null)

    try {
      // Close existing client before creating new one
      if (clientRef.current) {
        console.log('[XMTP] Closing existing client before switching to wallet')
        try {
          await clientRef.current.close()
          console.log('[XMTP] Previous client closed')
        } catch (e) {
          console.warn('[XMTP] Error closing previous client:', e)
        }
        clientRef.current = null
        setClient(null)

        // Small delay to ensure OPFS file handle is released
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Create signer from wallet client
      const signer = createWalletSigner(walletClient, address)

      // Build database path using address
      const dbPath = `xmtp-mwt-wallet-${address.toLowerCase()}`

      console.log('[XMTP] Initializing client for wallet:', {
        address,
        dbPath,
      })

      // Create new XMTP client
      const newClient = await Client.create(signer, {
        env: 'dev' as const,
        dbPath,
        appVersion: 'message-with-tokens/0.1.0',
        loggingLevel: import.meta.env.DEV ? LogLevel.Debug : LogLevel.Warn,
      })

      console.log('[XMTP] Wallet client created:', {
        inboxId: newClient.inboxId,
        installationId: newClient.installationId,
        dbPath,
      })

      clientRef.current = newClient
      setClient(newClient)
      setActiveUserId(WALLET_USER_ID)
      setInboxId(newClient.inboxId ?? null)
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to initialize XMTP client with wallet')
      console.error('XMTP wallet initialization error:', err)
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
  }, [activeUserId])

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

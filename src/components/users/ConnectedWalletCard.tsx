import { useState } from 'react'
import { useAccount, useWalletClient, usePublicClient, useEnsName, useEnsAvatar, useDisconnect, useChainId } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { Wallet, Copy, Check, X } from 'lucide-react'
import { useXMTP, WALLET_USER_ID } from '@/contexts/XMTPContext'
import { useUsers } from '@/hooks/useUsers'
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout'

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function ConnectedWalletCard() {
  const [copied, setCopied] = useState(false)
  const { address, isConnected, connector } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const chainId = useChainId()
  const { disconnect } = useDisconnect()
  const { initializeWithWallet, activeUserId, isConnecting } = useXMTP()
  const { selectUser } = useUsers()
  const { isMobile, showConversations } = useResponsiveLayout()

  // Resolve ENS on mainnet regardless of connected chain
  const { data: ensName } = useEnsName({
    address,
    chainId: mainnet.id,
  })
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName ?? undefined,
    chainId: mainnet.id,
  })

  if (!isConnected || !address) {
    return null
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const isActive = activeUserId === WALLET_USER_ID
  const isLoading = isConnecting && isActive
  const displayName = ensName ?? 'Connected Wallet'

  const handleSelect = async () => {
    if (!walletClient || !publicClient || isActive || isConnecting) return
    selectUser('') // Clear ephemeral selection immediately
    const connectorId = connector?.id ?? 'unknown'
    // Cast publicClient to satisfy type checker - wagmi/viem type incompatibility
    await initializeWithWallet(walletClient, publicClient as Parameters<typeof initializeWithWallet>[1], address, connectorId, chainId)
    // Navigate to conversations on mobile
    if (isMobile) {
      showConversations()
    }
  }

  return (
    <div
      className={`group flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all duration-150 ${
        isActive
          ? 'bg-zinc-800/80 ring-1 ring-zinc-500/40'
          : 'hover:bg-zinc-800/40'
      } ${isLoading ? 'opacity-70' : ''}`}
      onClick={handleSelect}
    >
      {/* Avatar - ENS avatar or fallback to wallet icon */}
      {ensAvatar ? (
        <img
          src={ensAvatar}
          alt={displayName}
          className="w-7 h-7 rounded-full flex-shrink-0 shadow-sm ring-1 ring-zinc-500/30 object-cover"
        />
      ) : (
        <div className="w-7 h-7 rounded-full flex items-center justify-center bg-gradient-to-br from-zinc-600 to-zinc-700 flex-shrink-0 shadow-sm ring-1 ring-zinc-500/30">
          <Wallet className="h-3.5 w-3.5 text-zinc-300" />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col items-start">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-zinc-300 truncate">{displayName}</span>
          <span className="text-[9px] font-mono uppercase tracking-wider px-1 py-px rounded bg-zinc-700/50 text-zinc-400 ring-1 ring-zinc-600/50 flex-shrink-0">
            Connected
          </span>
        </div>
        <div className="text-[10px] font-mono text-zinc-600">
          {truncateAddress(address)}
        </div>
      </div>

      {/* Copy */}
      <button
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-600 hover:bg-zinc-700/50 hover:text-zinc-400 active:scale-95 transition-all duration-150"
        onClick={handleCopy}
        title="Copy address"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Disconnect */}
      <button
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-600 hover:bg-red-500/20 hover:text-red-400 active:bg-red-500/30 active:text-red-300 active:scale-95 transition-all duration-150"
        onClick={(e) => {
          e.stopPropagation()
          if (confirm('Disconnect wallet?')) {
            disconnect()
          }
        }}
        title="Disconnect wallet"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Loading indicator */}
      {isLoading && (
        <div className="w-3 h-3 border border-zinc-500 border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  )
}

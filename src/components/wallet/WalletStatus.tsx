import { useAccount, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { Button } from '@/components/ui/button'
import { Wallet, X } from 'lucide-react'

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function WalletStatus() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  if (!isConnected || !address) {
    return null
  }

  const isWrongNetwork = chainId !== baseSepolia.id

  if (isWrongNetwork) {
    return (
      <Button
        variant="destructive"
        size="sm"
        onClick={() => switchChain({ chainId: baseSepolia.id })}
        disabled={isSwitching}
        className="w-full h-8 text-xs"
      >
        {isSwitching ? 'Switching...' : 'Switch to Base Sepolia'}
      </Button>
    )
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <Wallet className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
        <span className="font-mono text-xs text-zinc-300 truncate">
          {truncateAddress(address)}
        </span>
        <span className="text-[10px] text-zinc-600 font-mono bg-zinc-800 px-1.5 py-0.5 rounded flex-shrink-0">
          Base Sepolia
        </span>
      </div>
      <button
        onClick={() => disconnect()}
        className="text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

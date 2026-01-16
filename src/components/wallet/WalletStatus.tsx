import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useDisconnect, useSwitchChain } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { Button } from '@/components/ui/button'
import { CopyableAddress } from '@/components/ui/copyable-address'
import { Wallet, X } from 'lucide-react'

export function WalletStatus() {
  const { disconnect } = useDisconnect()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  return (
    <ConnectButton.Custom>
      {({ account, chain, mounted }) => {
        const connected = mounted && account && chain

        if (!connected) {
          return null
        }

        const isWrongNetwork = chain.unsupported || chain.id !== baseSepolia.id

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
              <Wallet className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
              <CopyableAddress
                address={account.address as `0x${string}`}
                className="text-xs text-zinc-300"
              />
              <span className="text-[10px] text-zinc-600 font-mono bg-zinc-800 px-1.5 py-0.5 rounded flex-shrink-0">
                Base Sepolia
              </span>
            </div>
            <button
              onClick={() => disconnect()}
              className="text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 flex items-center justify-center"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}

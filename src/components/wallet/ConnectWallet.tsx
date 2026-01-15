import { useConnect } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Wallet } from 'lucide-react'

export function ConnectWallet() {
  const { connect, connectors, isPending } = useConnect()

  // Find injected (MetaMask) and WalletConnect connectors
  const injectedConnector = connectors.find(c => c.id === 'injected')
  const walletConnectConnector = connectors.find(c => c.id === 'walletConnect')

  return (
    <div className="flex gap-2">
      {injectedConnector && (
        <Button
          onClick={() => connect({ connector: injectedConnector })}
          disabled={isPending}
          size="sm"
          className="flex-1 text-xs bg-zinc-100 hover:bg-white active:bg-zinc-200 text-zinc-900 touch-manipulation"
        >
          <Wallet className="h-3.5 w-3.5 mr-1.5" />
          {isPending ? 'Connecting...' : 'Connect'}
        </Button>
      )}
      {walletConnectConnector && !injectedConnector && (
        <Button
          variant="outline"
          onClick={() => connect({ connector: walletConnectConnector })}
          disabled={isPending}
          size="sm"
          className="flex-1 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800 touch-manipulation"
        >
          WalletConnect
        </Button>
      )}
      {!injectedConnector && !walletConnectConnector && (
        <Button disabled size="sm" className="w-full text-xs">
          No Wallet Found
        </Button>
      )}
    </div>
  )
}

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Button } from '@/components/ui/button'
import { Wallet } from 'lucide-react'

export function ConnectWallet() {
  return (
    <ConnectButton.Custom>
      {({ openConnectModal, connectModalOpen }) => (
        <div className="flex gap-2">
          <Button
            onClick={openConnectModal}
            disabled={connectModalOpen}
            size="sm"
            className="flex-1 text-xs bg-zinc-100 hover:bg-white active:bg-zinc-200 text-zinc-900 touch-manipulation"
          >
            <Wallet className="h-3.5 w-3.5 mr-1.5" />
            {connectModalOpen ? 'Connecting...' : 'Connect'}
          </Button>
        </div>
      )}
    </ConnectButton.Custom>
  )
}

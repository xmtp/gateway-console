import { useState, useEffect } from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useMintMusd } from '@/hooks/useMintMusd'
import { Loader2, CheckCircle2, XCircle, Clock, Coins } from 'lucide-react'
import { TOKENS } from '@/lib/constants'

export function FaucetDialog() {
  const [open, setOpen] = useState(false)
  const { address, isConnected, chainId } = useAccount()
  const { switchChain } = useSwitchChain()

  const {
    mint,
    status,
    error,
    isRateLimited,
    remainingTime,
    isPending,
    reset,
  } = useMintMusd()

  const isWrongNetwork = chainId !== baseSepolia.id

  // Reset status when dialog opens
  useEffect(() => {
    if (open && status !== 'idle') {
      // Only reset if it's a terminal state
      if (status === 'success' || status === 'error') {
        reset()
      }
    }
  }, [open, status, reset])

  const handleMint = () => {
    if (!address) return
    mint(address)
  }

  const handleSwitchNetwork = () => {
    switchChain({ chainId: baseSepolia.id })
  }

  const renderContent = () => {
    // Not connected
    if (!isConnected) {
      return (
        <div className="text-center py-4">
          <p className="text-muted-foreground">
            Connect your wallet to mint test funds.
          </p>
        </div>
      )
    }

    // Wrong network
    if (isWrongNetwork) {
      return (
        <div className="text-center py-4 space-y-4">
          <p className="text-muted-foreground">
            Switch to Base Sepolia to mint test funds.
          </p>
          <Button onClick={handleSwitchNetwork}>
            Switch Network
          </Button>
        </div>
      )
    }

    // Rate limited
    if (isRateLimited && status === 'idle') {
      return (
        <div className="text-center py-4 space-y-3">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">
            You can mint again in <span className="font-medium">{remainingTime}</span>
          </p>
        </div>
      )
    }

    // Pending/Confirming
    if (status === 'pending' || status === 'confirming') {
      return (
        <div className="text-center py-4 space-y-3">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
          <p className="text-muted-foreground">
            {status === 'pending' ? 'Confirm in wallet...' : 'Confirming transaction...'}
          </p>
        </div>
      )
    }

    // Success
    if (status === 'success') {
      return (
        <div className="text-center py-4 space-y-3">
          <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" />
          <p className="font-medium text-green-600">
            1,000 {TOKENS.underlyingFeeToken.displaySymbol} minted!
          </p>
          <Button onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      )
    }

    // Error
    if (status === 'error') {
      return (
        <div className="text-center py-4 space-y-3">
          <XCircle className="h-12 w-12 mx-auto text-destructive" />
          <p className="text-destructive text-sm">
            {error?.message || 'Transaction failed'}
          </p>
          <Button variant="outline" onClick={reset}>
            Try Again
          </Button>
        </div>
      )
    }

    // Ready state
    return (
      <div className="text-center py-4 space-y-4">
        <Coins className="h-12 w-12 mx-auto text-primary" />
        <div>
          <p className="font-medium">Get 1,000 {TOKENS.underlyingFeeToken.displaySymbol}</p>
          <p className="text-sm text-muted-foreground">
            Test tokens for sending messages on testnet
          </p>
        </div>
        <Button onClick={handleMint} disabled={isPending} className="w-full">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Mint Test Funds
        </Button>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={!isConnected}>
          Get Test Funds
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Test Faucet</DialogTitle>
          <DialogDescription>
            Mint {TOKENS.underlyingFeeToken.displaySymbol} tokens to fund your messaging
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  )
}

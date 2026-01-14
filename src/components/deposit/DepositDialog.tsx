import { useState, useEffect } from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { formatUnits } from 'viem'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDeposit } from '@/hooks/useDeposit'
import { Loader2, CheckCircle2, XCircle, ArrowDownToLine, PenLine } from 'lucide-react'
import { TOKENS, GATEWAY_PAYER_ADDRESS } from '@/lib/constants'

export function DepositDialog() {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const { isConnected, chainId } = useAccount()
  const { switchChain } = useSwitchChain()

  const {
    deposit,
    status,
    error,
    isPending,
    balance,
    reset,
  } = useDeposit()

  const isWrongNetwork = chainId !== baseSepolia.id
  const hasPayerAddress = !!GATEWAY_PAYER_ADDRESS

  // Format balance for display
  const formattedBalance = balance
    ? formatUnits(balance, TOKENS.underlyingFeeToken.decimals)
    : '0'

  // Parse amount
  const parsedAmount = parseFloat(amount) || 0
  const maxAmount = parseFloat(formattedBalance)
  const isValidAmount = parsedAmount > 0 && parsedAmount <= maxAmount

  // Reset when dialog opens
  useEffect(() => {
    if (open && (status === 'success' || status === 'error')) {
      reset()
      setAmount('')
    }
  }, [open, status, reset])

  const handleDeposit = () => {
    if (!isValidAmount) return
    deposit(amount)
  }

  const handleMax = () => {
    setAmount(formattedBalance)
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
            Connect your wallet to deposit funds.
          </p>
        </div>
      )
    }

    // No payer address configured
    if (!hasPayerAddress) {
      return (
        <div className="text-center py-4">
          <p className="text-muted-foreground">
            Gateway payer address not configured. Please set VITE_GATEWAY_PAYER_ADDRESS.
          </p>
        </div>
      )
    }

    // Wrong network
    if (isWrongNetwork) {
      return (
        <div className="text-center py-4 space-y-4">
          <p className="text-muted-foreground">
            Switch to Base Sepolia to deposit funds.
          </p>
          <Button onClick={handleSwitchNetwork}>
            Switch Network
          </Button>
        </div>
      )
    }

    // Signing
    if (status === 'signing') {
      return (
        <div className="text-center py-4 space-y-3">
          <PenLine className="h-12 w-12 mx-auto text-primary" />
          <p className="text-muted-foreground">
            Sign the permit in your wallet...
          </p>
          <p className="text-xs text-muted-foreground">
            This gasless signature approves the deposit
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
            {status === 'pending' ? 'Confirm in wallet...' : 'Confirming deposit...'}
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
            Deposit successful!
          </p>
          <p className="text-sm text-muted-foreground">
            Your messaging balance has been updated
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
            {error?.message || 'Deposit failed'}
          </p>
          <Button variant="outline" onClick={reset}>
            Try Again
          </Button>
        </div>
      )
    }

    // Ready state - input form
    return (
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Amount</span>
            <span className="text-muted-foreground">
              Balance: {formattedBalance} {TOKENS.underlyingFeeToken.displaySymbol}
            </span>
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
              className="flex-1"
            />
            <Button variant="outline" size="sm" onClick={handleMax}>
              Max
            </Button>
          </div>
          {parsedAmount > maxAmount && (
            <p className="text-xs text-destructive">
              Insufficient balance
            </p>
          )}
        </div>

        <Button
          onClick={handleDeposit}
          disabled={!isValidAmount || isPending}
          className="w-full"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Deposit
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Deposits fund your messaging balance for this app
        </p>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          disabled={!isConnected || !hasPayerAddress}
          size="sm"
          className="w-full h-8 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
        >
          <ArrowDownToLine className="h-3.5 w-3.5 mr-1.5" />
          Deposit to App
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deposit Messaging Funds</DialogTitle>
          <DialogDescription>
            Fund your messaging balance with {TOKENS.underlyingFeeToken.displaySymbol}
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  )
}

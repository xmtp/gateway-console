import { useState, useEffect, useMemo } from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { formatUnits } from 'viem'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
  ResponsiveDialogDescription,
} from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDeposit } from '@/hooks/useDeposit'
import { usePayerBalance } from '@/hooks/usePayerBalance'
import { useGasReserveBalance } from '@/hooks/useGasReserveBalance'
import { Loader2, CheckCircle2, XCircle, ArrowDownToLine, PenLine, MessageSquare, Fuel, Info } from 'lucide-react'
import { TOKENS, GATEWAY_PAYER_ADDRESS } from '@/lib/constants'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function DepositDialog() {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const { isConnected, chainId } = useAccount()
  const { switchChain } = useSwitchChain()

  const {
    deposit,
    calculateTargetedSplit,
    targetMessagingPercent,
    targetGasPercent,
    status,
    error,
    isPending,
    balance,
    reset,
  } = useDeposit()

  // Get current balances to calculate targeted split
  const { rawBalance: currentMessagingBalance } = usePayerBalance()
  const { balance: currentGasBalance } = useGasReserveBalance()

  const isWrongNetwork = chainId !== baseSepolia.id
  const hasPayerAddress = !!GATEWAY_PAYER_ADDRESS

  // Format wallet balance for display
  const rawBalance = balance
    ? parseFloat(formatUnits(balance, TOKENS.underlyingFeeToken.decimals))
    : 0
  const formattedBalance = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rawBalance)

  // Parse amount
  const parsedAmount = parseFloat(amount) || 0
  const maxAmount = rawBalance
  const isValidAmount = parsedAmount > 0 && parsedAmount <= maxAmount

  // Calculate targeted split based on current balances
  const splitPreview = useMemo(() => {
    if (parsedAmount <= 0) {
      return { payerAmount: 0n, appChainAmount: 0n, messagingPercent: 0, gasPercent: 0 }
    }

    const amountBigInt = BigInt(Math.floor(parsedAmount * 10 ** TOKENS.underlyingFeeToken.decimals))
    const currentMessaging = currentMessagingBalance ?? 0n
    const currentGas = currentGasBalance ?? 0n

    const { payerAmount, appChainAmount } = calculateTargetedSplit(
      amountBigInt,
      currentMessaging,
      currentGas
    )

    // Calculate actual percentages for this deposit
    const total = payerAmount + appChainAmount
    const messagingPercent = total > 0n ? Math.round(Number(payerAmount * 100n / total)) : 0
    const gasPercent = total > 0n ? Math.round(Number(appChainAmount * 100n / total)) : 0

    return { payerAmount, appChainAmount, messagingPercent, gasPercent }
  }, [parsedAmount, currentMessagingBalance, currentGasBalance, calculateTargetedSplit])

  // Format split amounts
  const formatSplitAmount = (amt: bigint) => {
    const value = Number(amt) / 10 ** TOKENS.underlyingFeeToken.decimals
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value)
  }

  // Reset when dialog opens (only on open transition, not on status change)
  useEffect(() => {
    if (open) {
      reset()
      setAmount('')
    }
  }, [open, reset])

  const handleDeposit = () => {
    if (!isValidAmount) return
    deposit(amount, currentMessagingBalance ?? 0n, currentGasBalance ?? 0n)
  }

  const handleMax = () => {
    setAmount(rawBalance.toString())
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
            Sign the approval in your wallet...
          </p>
          <p className="text-xs text-muted-foreground">
            This signature authorizes the deposit
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
            Your messaging balance and gas reserve have been updated
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
      <TooltipProvider>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="text-muted-foreground">
                Balance: {formattedBalance}
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

          {/* Split Preview */}
          {parsedAmount > 0 && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Deposit Allocation</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p className="text-xs">
                      Split is calculated to target {targetMessagingPercent.toString()}% messaging / {targetGasPercent.toString()}% gas
                      across your total balance. Current allocation adjusts the split accordingly.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Messaging</span>
                    <span className="text-xs text-muted-foreground">({splitPreview.messagingPercent}%)</span>
                  </div>
                  <span className="font-mono text-sm">{formatSplitAmount(splitPreview.payerAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5">
                    <Fuel className="h-3.5 w-3.5 text-zinc-500" />
                    <span>Gas Reserve</span>
                    <span className="text-xs text-muted-foreground">({splitPreview.gasPercent}%)</span>
                  </div>
                  <span className="font-mono text-sm">{formatSplitAmount(splitPreview.appChainAmount)}</span>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleDeposit}
            disabled={!isValidAmount || isPending}
            className="w-full"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Depositing...
              </>
            ) : (
              'Deposit'
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Funds messaging and group operations for this app
          </p>
        </div>
      </TooltipProvider>
    )
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger asChild>
        <Button
          variant="outline"
          disabled={!isConnected || !hasPayerAddress}
          size="sm"
          className="w-full text-xs border-zinc-300 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 active:bg-zinc-200 disabled:text-zinc-400 disabled:border-zinc-200 touch-manipulation"
        >
          <ArrowDownToLine className="h-3.5 w-3.5 mr-1.5" />
          Deposit to App
        </Button>
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Deposit Messaging Funds</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Fund your messaging balance with {TOKENS.underlyingFeeToken.displaySymbol}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {renderContent()}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

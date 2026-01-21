import { usePayerBalance } from '@/hooks/usePayerBalance'
import { useGasReserveBalance } from '@/hooks/useGasReserveBalance'
import { usePendingDecrement } from '@/hooks/useMessageCountDecrement'
import { GATEWAY_PAYER_ADDRESS } from '@/lib/constants'
import { CopyableAddress } from '@/components/ui/copyable-address'
import { Loader2, AlertTriangle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { AnimatedMessageCounter } from './AnimatedMessageCounter'

export function BalanceDisplay() {
  const {
    messagesAvailable,
    rawBalance: messagingBalance,
    warningLevel,
    isLoading,
    error,
  } = usePayerBalance()

  const {
    balance: gasBalance,
    formattedBalance: formattedGasBalance,
  } = useGasReserveBalance()

  // Get pending decrements from message sends
  // Reset is handled in usePayerBalance when real balance updates
  const pendingDecrement = usePendingDecrement()

  // Display value accounts for pending decrements
  const displayMessages = Math.max(0, messagesAvailable - pendingDecrement)

  // Calculate combined total balance
  // Note: messagingBalance is 6 decimals (xUSD token), gasBalance is 18 decimals (native)
  const messagingDollars = Number(messagingBalance ?? 0n) / 1_000_000
  const gasDollars = Number(gasBalance ?? 0n) / 1_000_000_000_000_000_000
  const totalBalanceDollars = messagingDollars + gasDollars
  const formattedTotalBalance = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(totalBalanceDollars)

  // No payer address configured
  if (!GATEWAY_PAYER_ADDRESS) {
    return (
      <div className="py-2">
        <p className="text-xs text-zinc-500 font-mono">
          Set VITE_GATEWAY_PAYER_ADDRESS
        </p>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />
        <span className="text-xs text-zinc-500 font-mono">Loading...</span>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="py-2">
        <p className="text-xs text-red-400 font-mono">Failed to load</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* App wallet address */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-between cursor-help">
              <span className="text-xs text-zinc-500 font-mono">Address</span>
              <CopyableAddress address={GATEWAY_PAYER_ADDRESS} className="text-[10px] text-zinc-400" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={22} className="max-w-xs">
            <div className="space-y-2 text-xs">
              <p className="font-medium">Gateway Payer Address</p>
              <p className="text-muted-foreground">
                This wallet pays messaging fees on behalf of your app's users. Use the Deposit button to add funds to your messaging balance.
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Messages meter */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="space-y-1 cursor-help">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-zinc-500 font-mono">Messages</span>
                {warningLevel !== 'none' && (
                  <AlertTriangle className="h-3 w-3 text-amber-400" />
                )}
              </div>
              <div className="flex items-baseline gap-1.5">
                <AnimatedMessageCounter
                  value={displayMessages}
                  className={cn(
                    warningLevel !== 'none' ? 'text-zinc-500' : 'text-emerald-400'
                  )}
                />
                <span className="text-xs text-zinc-500 font-mono">available</span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={22} className="max-w-xs">
            <div className="space-y-2 text-xs">
              <p className="font-medium">Estimated Messages</p>
              <p className="text-muted-foreground">
                This is an estimate based on your current balance and average message costs.
              </p>
              <p className="text-[10px] text-zinc-500 pt-1 border-t border-white/10">
                Message fees are tracked by nodes as unsettled usage, then periodically settled on-chain. Your actual available messages may vary slightly until settlement completes.
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* mUSD Balance row */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-between pt-1 border-t border-zinc-800 cursor-help">
              <span className="text-xs text-zinc-500 font-mono">mUSD Balance</span>
              <span className="text-xs text-zinc-300 font-mono tabular-nums">{formattedTotalBalance}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={22} className="max-w-xs">
            <div className="space-y-2 text-xs">
              <p className="font-medium">Balance Breakdown</p>
              <div className="space-y-2 text-muted-foreground">
                <div>
                  <div className="flex justify-between gap-4">
                    <span className="text-white">Messaging</span>
                    <span className="font-mono">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(messagingBalance ?? 0n) / 1_000_000)}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500">Pays for sending messages. Held on Base Sepolia.</p>
                </div>
                <div>
                  <div className="flex justify-between gap-4">
                    <span className="text-white">Gas Reserve</span>
                    <span className="font-mono">{formattedGasBalance}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500">Pays for on-chain operations like creating groups and adding members. Held on XMTP Appchain.</p>
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 pt-1 border-t border-white/10">
                Deposits are automatically split between these two balances.
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

    </div>
  )
}

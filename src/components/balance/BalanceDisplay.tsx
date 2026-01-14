import { usePayerBalance } from '@/hooks/usePayerBalance'
import { GATEWAY_PAYER_ADDRESS } from '@/lib/constants'
import { Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function BalanceDisplay() {
  const {
    formattedMessages,
    formattedBalance,
    warningLevel,
    isLoading,
    error,
  } = usePayerBalance()

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
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500 font-mono">Address</span>
        <span className="text-[10px] text-zinc-400 font-mono">{truncateAddress(GATEWAY_PAYER_ADDRESS)}</span>
      </div>

      {/* Messages meter */}
      <div className="space-y-1">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-zinc-500 font-mono">Messages</span>
          {warningLevel !== 'none' && (
            <AlertTriangle className={cn(
              'h-3 w-3',
              warningLevel === 'critical' ? 'text-red-400' : 'text-amber-400'
            )} />
          )}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className={cn(
            'text-2xl font-mono font-bold tabular-nums',
            warningLevel === 'critical' ? 'text-red-400' :
            warningLevel === 'low' ? 'text-amber-400' : 'text-emerald-400'
          )}>
            {formattedMessages}
          </span>
          <span className="text-xs text-zinc-500 font-mono">available</span>
        </div>
      </div>

      {/* Balance row */}
      <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
        <span className="text-xs text-zinc-500 font-mono">mUSD Balance</span>
        <span className="text-xs text-zinc-300 font-mono tabular-nums">{formattedBalance}</span>
      </div>

      {/* Warning */}
      {warningLevel === 'critical' && (
        <div className="bg-red-950/50 border border-red-900/50 rounded px-2 py-1.5">
          <p className="text-xs text-red-400 font-mono">Deposit funds to continue</p>
        </div>
      )}
    </div>
  )
}

import { usePayerBalance } from '@/hooks/usePayerBalance'
import { useGasReserveBalance } from '@/hooks/useGasReserveBalance'
import { GATEWAY_PAYER_ADDRESS } from '@/lib/constants'
import { CopyableAddress } from '@/components/ui/copyable-address'
import { Loader2, AlertTriangle, Fuel } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export function BalanceDisplay() {
  const {
    formattedMessages,
    formattedBalance,
    warningLevel,
    isLoading,
    error,
  } = usePayerBalance()

  const {
    formattedOperations,
    warningLevel: gasWarningLevel,
    isLoading: isGasLoading,
  } = useGasReserveBalance()

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
        <CopyableAddress address={GATEWAY_PAYER_ADDRESS} className="text-[10px] text-zinc-400" />
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

      {/* Gas Reserve section - secondary prominence */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="pt-2 border-t border-zinc-800/50 cursor-help">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Fuel className="h-3 w-3 text-zinc-600" />
                  <span className="text-[11px] text-zinc-500 font-mono">Gas Reserve</span>
                  {gasWarningLevel !== 'none' && (
                    <AlertTriangle className={cn(
                      'h-2.5 w-2.5',
                      gasWarningLevel === 'critical' ? 'text-red-400' : 'text-amber-400'
                    )} />
                  )}
                </div>
                <span className={cn(
                  'text-[11px] font-mono tabular-nums',
                  gasWarningLevel === 'critical' ? 'text-red-400' :
                  gasWarningLevel === 'low' ? 'text-amber-400' : 'text-zinc-400'
                )}>
                  {isGasLoading ? '...' : `${formattedOperations} ops`}
                </span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1.5 text-xs">
              <p className="font-medium">Gas Reserve for Group Operations</p>
              <p className="text-muted-foreground">
                Used for on-chain operations like group membership changes and identity updates.
                Separate from message fees.
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

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

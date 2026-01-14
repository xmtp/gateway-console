import { usePayerBalance } from '@/hooks/usePayerBalance'
import { GATEWAY_PAYER_ADDRESS } from '@/lib/constants'
import { Loader2, AlertTriangle, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BalanceDisplay() {
  const {
    formattedMessages,
    formattedBalance,
    messagesAvailable,
    warningLevel,
    isLoading,
    error,
  } = usePayerBalance()

  // No payer address configured
  if (!GATEWAY_PAYER_ADDRESS) {
    return (
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Configure VITE_GATEWAY_PAYER_ADDRESS to see balance
        </p>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading balance...</span>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="text-center">
        <p className="text-sm text-destructive">
          Failed to load balance
        </p>
      </div>
    )
  }

  return (
    <div className="text-center space-y-1">
      {/* Messages available - prominent display */}
      <div
        className={cn(
          'flex items-center justify-center gap-2',
          warningLevel === 'critical' && 'text-destructive',
          warningLevel === 'low' && 'text-yellow-600'
        )}
      >
        {warningLevel !== 'none' && (
          <AlertTriangle className="h-5 w-5" />
        )}
        {warningLevel === 'none' && (
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
        )}
        <span className="text-2xl font-bold">
          {formattedMessages}
        </span>
        <span className="text-lg text-muted-foreground">
          messages available
        </span>
      </div>

      {/* Balance in USD - smaller */}
      <p className="text-sm text-muted-foreground">
        {formattedBalance} balance
      </p>

      {/* Warning messages */}
      {warningLevel === 'critical' && (
        <p className="text-xs text-destructive font-medium">
          Add funds to continue messaging
        </p>
      )}
      {warningLevel === 'low' && messagesAvailable >= 10 && (
        <p className="text-xs text-yellow-600">
          Running low - consider adding funds
        </p>
      )}
    </div>
  )
}

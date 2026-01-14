import { useMemo } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { calculateMessageCost, getMessageBytes, formatMicroCost } from '@/lib/messageCosting'
import { DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageCostBadgeProps {
  /** Message text to calculate cost for */
  message: string
  /** Whether to show a compact version */
  compact?: boolean
  /** Additional class names */
  className?: string
}

/**
 * Displays estimated message cost with breakdown tooltip
 */
export function MessageCostBadge({ message, compact = false, className }: MessageCostBadgeProps) {
  const costResult = useMemo(() => {
    const bytes = getMessageBytes(message)
    // Minimum 1 byte for empty messages
    return calculateMessageCost(Math.max(1, bytes))
  }, [message])

  const messageBytes = getMessageBytes(message)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'inline-flex items-center gap-1 text-xs text-muted-foreground',
              'cursor-help',
              className
            )}
          >
            {!compact && <DollarSign className="h-3 w-3" />}
            <span className={cn(compact && 'opacity-70')}>
              {compact ? `~${costResult.formattedCost}` : costResult.formattedCost}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1.5 text-xs">
            <p className="font-medium">Message Cost Breakdown</p>
            <div className="space-y-0.5 text-muted-foreground">
              <div className="flex justify-between gap-4">
                <span>Base fee:</span>
                <span>{formatMicroCost(costResult.breakdown.messageFee)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Storage ({messageBytes} bytes × 60 days):</span>
                <span>{formatMicroCost(costResult.breakdown.storageFee)}</span>
              </div>
              <div className="flex justify-between gap-4 pt-1 border-t font-medium text-foreground">
                <span>Total (with gas overhead):</span>
                <span>{costResult.formattedCost}</span>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

import { useMemo } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { calculateMessageCost, getMessageBytes, estimatePayloadSize, formatMicroCost, ENCODING_OVERHEAD_BYTES } from '@/lib/messageCosting'
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
 * Uses estimated payload size (text bytes + protocol overhead)
 */
export function MessageCostBadge({ message, compact = false, className }: MessageCostBadgeProps) {
  const { costResult, textBytes, payloadBytes } = useMemo(() => {
    const textBytes = getMessageBytes(message)
    const payloadBytes = estimatePayloadSize(message)
    // Use payload size for cost calculation
    return {
      costResult: calculateMessageCost(Math.max(1, payloadBytes)),
      textBytes,
      payloadBytes,
    }
  }, [message])

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
            <p className="font-medium">Estimated Message Cost</p>
            <div className="space-y-0.5 text-muted-foreground">
              <div className="flex justify-between gap-4">
                <span>Text:</span>
                <span>{textBytes} bytes</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Protocol overhead:</span>
                <span>~{ENCODING_OVERHEAD_BYTES} bytes</span>
              </div>
              <div className="flex justify-between gap-4 pt-1 border-t border-white/10">
                <span>Total payload:</span>
                <span>~{payloadBytes} bytes</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Base fee:</span>
                <span>{formatMicroCost(costResult.breakdown.messageFee)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Storage (60 days):</span>
                <span>{formatMicroCost(costResult.breakdown.storageFee)}</span>
              </div>
              <div className="flex justify-between gap-4 pt-1 border-t border-white/10 font-medium text-white">
                <span>Est. total:</span>
                <span>{costResult.formattedCost}</span>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

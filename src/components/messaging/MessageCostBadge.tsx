import { useMemo } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { calculateMessageCost, getMessageBytes, estimatePayloadSize, formatMicroCost, ENCODING_OVERHEAD_BYTES } from '@/lib/messageCosting'
import { cn } from '@/lib/utils'

interface MessageCostBadgeProps {
  /** Message text to calculate cost for */
  message: string
  /** Whether to show a compact version */
  compact?: boolean
  /** Additional class names */
  className?: string
  /** Tooltip placement side */
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right'
}

/**
 * Displays estimated message cost with breakdown tooltip
 * Uses estimated payload size (text bytes + protocol overhead)
 */
export function MessageCostBadge({ message, compact = false, className, tooltipSide = 'top' }: MessageCostBadgeProps) {
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
          <span
            className={cn(
              'text-xs text-zinc-500 font-mono cursor-help',
              compact && 'text-[10px]',
              className
            )}
          >
            {costResult.formattedCost}
          </span>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide} className="max-w-xs">
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
            <p className="text-[10px] text-zinc-500 pt-1 border-t border-white/10">
              Paid from Messaging Balance on Base Sepolia
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

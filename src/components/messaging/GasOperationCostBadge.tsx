import { useMemo } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { calculateGasOperationCost, type GasOperationType } from '@/lib/gasCosting'
import { cn } from '@/lib/utils'

interface GasOperationCostBadgeProps {
  /** Type of gas operation */
  operation: GasOperationType
  /** Whether to show a compact version */
  compact?: boolean
  /** Additional class names */
  className?: string
  /** Tooltip placement side */
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right'
}

/**
 * Displays estimated gas cost for group operations with breakdown tooltip
 * Uses the selected design: Fuel icon + cost text
 */
export function GasOperationCostBadge({
  operation,
  compact = false,
  className,
  tooltipSide = 'top',
}: GasOperationCostBadgeProps) {
  const costInfo = useMemo(() => {
    return calculateGasOperationCost(operation)
  }, [operation])

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
            {costInfo.formattedCost}
          </span>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide} className="max-w-xs">
          <div className="space-y-1.5 text-xs">
            <p className="font-medium">Gas Fee Estimate</p>
            <div className="space-y-0.5 text-muted-foreground">
              <div className="flex justify-between gap-4">
                <span>Operation:</span>
                <span>{costInfo.description}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Est. gas:</span>
                <span>{costInfo.gasUnits.toLocaleString()} units</span>
              </div>
              <div className="flex justify-between gap-4 pt-1 border-t border-white/10 font-medium text-white">
                <span>Est. cost:</span>
                <span>{costInfo.formattedCost}</span>
              </div>
            </div>
            <p className="text-[10px] text-zinc-500 pt-1 border-t border-white/10">
              Paid from Gas Reserve on XMTP Appchain
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

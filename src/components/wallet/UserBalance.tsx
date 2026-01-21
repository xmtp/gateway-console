import { useAccount, useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { baseSepolia } from 'wagmi/chains'
import { MockUnderlyingFeeTokenAbi } from '@/abi/MockUnderlyingFeeToken'
import { TOKENS } from '@/lib/constants'
import { Loader2 } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function UserBalance() {
  const { address, isConnected } = useAccount()

  const { data: balance, isLoading } = useReadContract({
    address: TOKENS.underlyingFeeToken.address,
    abi: MockUnderlyingFeeTokenAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: baseSepolia.id,
    query: {
      enabled: isConnected && !!address,
    },
  })

  if (!isConnected) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />
        <span className="text-xs text-zinc-500 font-mono">Loading...</span>
      </div>
    )
  }

  const formattedBalance = balance
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(parseFloat(formatUnits(balance, TOKENS.underlyingFeeToken.decimals)))
    : '$0.00'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-between cursor-help">
            <span className="text-xs text-zinc-500 font-mono">mUSD Balance</span>
            <span className="text-xs text-zinc-300 font-mono tabular-nums">{formattedBalance}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={22} className="max-w-xs">
          <div className="space-y-1 text-xs">
            <p className="font-medium">Your Wallet Balance</p>
            <p className="text-muted-foreground">
              mUSD is a mock stablecoin on XMTP testnet. On mainnet, fees are paid in Base USDC.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

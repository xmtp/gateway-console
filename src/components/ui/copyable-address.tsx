import { useState, useCallback } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CopyableAddressProps {
  address: string
  className?: string
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function CopyableAddress({ address, className }: CopyableAddressProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [address])

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'group/copy inline-flex items-center gap-1 font-mono cursor-pointer min-h-[44px] px-2 -mx-2 touch-manipulation',
        className
      )}
      title={`Click to copy: ${address}`}
    >
      <span>{truncateAddress(address)}</span>
      {copied ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3 opacity-0 group-hover/copy:opacity-50 transition-opacity" />
      )}
    </button>
  )
}

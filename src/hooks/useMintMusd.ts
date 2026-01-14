import { useCallback, useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, type Address } from 'viem'
import { useLocalStorage } from '@mantine/hooks'
import { MockUnderlyingFeeTokenAbi } from '@/abi/MockUnderlyingFeeToken'
import { TOKENS, STORAGE_KEYS } from '@/lib/constants'

// Rate limit: 2 hours between mints
const RATE_LIMIT_MS = 2 * 60 * 60 * 1000

// Mint amount: 1000 mUSD
const MINT_AMOUNT = parseUnits('1000', TOKENS.underlyingFeeToken.decimals)

export type MintStatus = 'idle' | 'pending' | 'confirming' | 'success' | 'error'

export function useMintMusd() {
  const [status, setStatus] = useState<MintStatus>('idle')
  const [error, setError] = useState<Error | null>(null)

  const [lastMintTime, setLastMintTime] = useLocalStorage<number>({
    key: STORAGE_KEYS.lastFaucetMint,
    defaultValue: 0,
  })

  const { writeContract, data: hash, isPending: isWritePending } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Calculate remaining rate limit time
  const getRateLimitRemaining = useCallback(() => {
    if (!lastMintTime) return 0
    const elapsed = Date.now() - lastMintTime
    const remaining = RATE_LIMIT_MS - elapsed
    return remaining > 0 ? remaining : 0
  }, [lastMintTime])

  const isRateLimited = getRateLimitRemaining() > 0

  // Format remaining time as human-readable string
  const formatRemainingTime = useCallback(() => {
    const remaining = getRateLimitRemaining()
    if (remaining <= 0) return null

    const hours = Math.floor(remaining / (60 * 60 * 1000))
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }, [getRateLimitRemaining])

  const mint = useCallback(
    async (recipientAddress: Address) => {
      // Check rate limit
      if (isRateLimited) {
        setError(new Error('Rate limited. Please wait before minting again.'))
        return
      }

      setStatus('pending')
      setError(null)

      try {
        writeContract(
          {
            address: TOKENS.underlyingFeeToken.address,
            abi: MockUnderlyingFeeTokenAbi,
            functionName: 'mint',
            args: [recipientAddress, MINT_AMOUNT],
          },
          {
            onSuccess: () => {
              setStatus('confirming')
            },
            onError: (err) => {
              setStatus('error')
              setError(err instanceof Error ? err : new Error('Transaction rejected'))
            },
          }
        )
      } catch (err) {
        setStatus('error')
        setError(err instanceof Error ? err : new Error('Failed to mint'))
      }
    },
    [isRateLimited, writeContract]
  )

  // Track success and update rate limit
  if (isSuccess && status === 'confirming') {
    setStatus('success')
    setLastMintTime(Date.now())
  }

  // Track confirming state
  if (isConfirming && status === 'pending') {
    setStatus('confirming')
  }

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
  }, [])

  return {
    mint,
    status,
    error,
    isRateLimited,
    remainingTime: formatRemainingTime(),
    isPending: isWritePending || isConfirming,
    isSuccess,
    hash,
    reset,
  }
}

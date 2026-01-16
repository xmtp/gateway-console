import { useState, useCallback, useEffect } from 'react'
import { useBalance } from 'wagmi'
import { GATEWAY_PAYER_ADDRESS, XMTP_CHAIN_ID } from '@/lib/constants'
import { calculateOperationsAvailable } from '@/lib/gasCosting'

/**
 * Hook to fetch and calculate the gas reserve balance on XMTP Appchain
 *
 * The gas reserve is the native xUSD balance on the XMTP Appchain (L3).
 * It's used to pay for on-chain operations like group membership changes
 * and identity updates.
 *
 * Supports optimistic updates - call addOptimisticDeposit() after a deposit
 * to immediately reflect the expected balance before the bridge completes.
 */
export function useGasReserveBalance() {
  // Track optimistic deposit amount (clears when real balance catches up)
  const [optimisticAmount, setOptimisticAmount] = useState(0n)

  // Query native xUSD balance on XMTP Appchain
  // xUSD is the native token (like ETH on mainnet), so we don't specify a token address
  const {
    data: balanceData,
    isLoading,
    error,
    refetch,
  } = useBalance({
    address: GATEWAY_PAYER_ADDRESS,
    chainId: XMTP_CHAIN_ID,
    query: {
      enabled: !!GATEWAY_PAYER_ADDRESS,
      refetchInterval: 30_000, // Refetch every 30 seconds
    },
  })

  // Extract balance value (in 6 decimals for xUSD)
  const chainBalance = balanceData?.value ?? 0n

  // Debug logging
  console.log('[GasReserve] Balance query:', {
    address: GATEWAY_PAYER_ADDRESS,
    chainId: XMTP_CHAIN_ID,
    balanceData,
    chainBalance: chainBalance.toString(),
    isLoading,
    error: error?.message,
  })

  // Clear optimistic amount when chain balance catches up
  useEffect(() => {
    if (optimisticAmount > 0n && chainBalance >= optimisticAmount) {
      setOptimisticAmount(0n)
    }
  }, [chainBalance, optimisticAmount])

  // Add optimistic deposit amount (called after successful deposit tx)
  const addOptimisticDeposit = useCallback((amount: bigint) => {
    setOptimisticAmount((prev) => prev + amount)
  }, [])

  // Effective balance includes optimistic deposits
  const balance = chainBalance + optimisticAmount

  // Calculate operations available based on effective balance
  const calculation = calculateOperationsAvailable(balance)

  return {
    // Raw balance from chain
    rawBalance: balanceData,
    // Balance in xUSD (6 decimals) - includes optimistic deposits
    balance,
    // Chain balance without optimistic updates
    chainBalance,
    // Whether we have pending optimistic updates
    hasPendingDeposit: optimisticAmount > 0n,
    // Calculation results
    operationsAvailable: calculation.operationsAvailable,
    formattedOperations: calculation.formattedOperations,
    formattedBalance: calculation.formattedBalance,
    balanceDollars: calculation.balanceDollars,
    // Warning level
    warningLevel: calculation.warningLevel,
    isLowBalance: calculation.warningLevel !== 'none',
    // Loading state
    isLoading,
    error,
    refetch,
    // Optimistic update
    addOptimisticDeposit,
  }
}

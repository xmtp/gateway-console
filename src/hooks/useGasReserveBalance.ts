import { useBalance } from 'wagmi'
import { GATEWAY_PAYER_ADDRESS, XMTP_CHAIN_ID } from '@/lib/constants'
import { calculateOperationsAvailable } from '@/lib/gasCosting'

/**
 * Hook to fetch and calculate the gas reserve balance on XMTP Appchain
 *
 * The gas reserve is the native xUSD balance on the XMTP Appchain (L3).
 * It's used to pay for on-chain operations like group membership changes
 * and identity updates.
 */
export function useGasReserveBalance() {
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
  const balance = balanceData?.value ?? 0n

  // Calculate operations available
  const calculation = calculateOperationsAvailable(balance)

  return {
    // Raw balance from chain
    rawBalance: balanceData,
    // Balance in xUSD (6 decimals)
    balance,
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
  }
}

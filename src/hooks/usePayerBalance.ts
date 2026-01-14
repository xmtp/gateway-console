import { useReadContract } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { PayerRegistryAbi } from '@/abi/PayerRegistry'
import { CONTRACTS, GATEWAY_PAYER_ADDRESS } from '@/lib/constants'
import { calculateMessagesAvailable, getBalanceWarningLevel } from '@/lib/messageCosting'

/**
 * Hook to fetch and calculate the payer's messaging balance
 * Returns the raw balance, messages available, and formatted values
 */
export function usePayerBalance() {
  // Query payer balance from PayerRegistry
  const {
    data: balance,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: CONTRACTS.payerRegistry,
    abi: PayerRegistryAbi,
    functionName: 'getBalance',
    args: GATEWAY_PAYER_ADDRESS ? [GATEWAY_PAYER_ADDRESS] : undefined,
    chainId: baseSepolia.id,
    query: {
      enabled: !!GATEWAY_PAYER_ADDRESS,
      refetchInterval: 30_000, // Refetch every 30 seconds
    },
  })

  // Calculate messages available from balance
  // Balance from PayerRegistry is int104, but we treat negative as 0
  const safeBalance = balance && balance > 0n ? balance : 0n
  const calculation = calculateMessagesAvailable(safeBalance)
  const warningLevel = getBalanceWarningLevel(calculation.messagesAvailable)

  return {
    // Raw balance (int104 from contract, can be negative if in debt)
    rawBalance: balance,
    // Safe balance (0 if negative or undefined)
    balance: safeBalance,
    // Calculation results
    messagesAvailable: calculation.messagesAvailable,
    formattedMessages: calculation.formattedMessages,
    formattedBalance: calculation.formattedBalance,
    costPerMessage: calculation.costPerMessage,
    // Warning level
    warningLevel,
    isLowBalance: warningLevel !== 'none',
    // Loading state
    isLoading,
    error,
    refetch,
  }
}

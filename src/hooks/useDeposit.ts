import { useCallback, useEffect, useState } from 'react'
import {
  useAccount,
  useWalletClient,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from 'wagmi'
import { parseUnits } from 'viem'
import { baseSepolia } from 'wagmi/chains'
import { generatePermitSignature } from '@/lib/permit'
import { DepositSplitterAbi } from '@/abi/DepositSplitter'
import { MockUnderlyingFeeTokenAbi } from '@/abi/MockUnderlyingFeeToken'
import {
  CONTRACTS,
  TOKENS,
  GATEWAY_PAYER_ADDRESS,
  APPCHAIN_CONTRACTS,
  GAS_RESERVE_CONSTANTS,
} from '@/lib/constants'

export type DepositStatus = 'idle' | 'signing' | 'pending' | 'confirming' | 'success' | 'error'

export function useDeposit() {
  const [status, setStatus] = useState<DepositStatus>('idle')
  const [error, setError] = useState<Error | null>(null)

  const { address } = useAccount()
  const { data: walletClient } = useWalletClient({ chainId: baseSepolia.id })

  const { writeContract, data: hash, isPending } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Get user's mUSD balance
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: TOKENS.underlyingFeeToken.address,
    abi: MockUnderlyingFeeTokenAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: baseSepolia.id,
  })

  /**
   * Calculate deposit split amounts
   * @param totalAmount Total amount to deposit
   * @param gasRatioPercent Percentage to allocate to gas reserve (0-100)
   * @returns Object with payerAmount and appChainAmount
   */
  const calculateSplit = useCallback((totalAmount: bigint, gasRatioPercent: bigint) => {
    // Calculate gas reserve amount (rounded down)
    const appChainAmount = (totalAmount * gasRatioPercent) / 100n
    // Rest goes to payer registry
    const payerAmount = totalAmount - appChainAmount
    return { payerAmount, appChainAmount }
  }, [])

  const deposit = useCallback(
    async (amountString: string, gasRatioPercent: bigint = GAS_RESERVE_CONSTANTS.defaultGasRatioPercent) => {
      if (!address || !walletClient) {
        setError(new Error('Wallet not connected'))
        return
      }

      if (!GATEWAY_PAYER_ADDRESS) {
        setError(new Error('Gateway payer address not configured'))
        return
      }

      const amount = parseUnits(amountString, TOKENS.underlyingFeeToken.decimals)

      if (balance !== undefined && amount > balance) {
        setError(new Error('Insufficient balance'))
        return
      }

      // Calculate the split
      const { payerAmount, appChainAmount } = calculateSplit(amount, gasRatioPercent)

      setStatus('signing')
      setError(null)

      try {
        // Deadline: 1 hour from now
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 60)

        // Sign the permit
        const permit = await generatePermitSignature(
          walletClient,
          address,
          CONTRACTS.depositSplitter,
          amount,
          deadline
        )

        setStatus('pending')

        // Deposit with permit - split between messaging and gas reserve
        writeContract(
          {
            address: CONTRACTS.depositSplitter,
            abi: DepositSplitterAbi,
            functionName: 'depositFromUnderlyingWithPermit',
            args: [
              GATEWAY_PAYER_ADDRESS,                    // payer - the gateway's payer address
              payerAmount,                              // payerRegistryAmount - messaging fees
              APPCHAIN_CONTRACTS.appChainGateway,       // appChainRecipient - gas reserve recipient
              appChainAmount,                           // appChainAmount - gas reserve funds
              GAS_RESERVE_CONSTANTS.bridgeGasLimit,     // appChainGasLimit - for bridging
              GAS_RESERVE_CONSTANTS.bridgeMaxFeePerGas, // appChainMaxFeePerGas - for bridging
              deadline,                                 // permit deadline
              permit.v,                                 // signature v
              permit.r,                                 // signature r
              permit.s,                                 // signature s
            ],
            chainId: baseSepolia.id,
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
        if (err instanceof Error) {
          // User rejected the signature request
          if (err.message.includes('rejected') || err.message.includes('denied')) {
            setError(new Error('Signature rejected'))
          } else {
            setError(err)
          }
        } else {
          setError(new Error('Failed to sign permit'))
        }
      }
    },
    [address, walletClient, balance, writeContract, calculateSplit]
  )

  // Track confirming state
  useEffect(() => {
    if (isConfirming && status === 'pending') {
      setStatus('confirming')
    }
  }, [isConfirming, status])

  // Track success state
  useEffect(() => {
    if (isSuccess && status === 'confirming') {
      setStatus('success')
      refetchBalance()
    }
  }, [isSuccess, status, refetchBalance])

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
  }, [])

  return {
    deposit,
    calculateSplit,
    defaultGasRatioPercent: GAS_RESERVE_CONSTANTS.defaultGasRatioPercent,
    status,
    error,
    isPending: isPending || isConfirming || status === 'signing',
    isSuccess,
    hash,
    balance,
    reset,
    refetchBalance,
  }
}

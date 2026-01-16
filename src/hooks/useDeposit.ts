import { useCallback, useEffect, useState, useRef } from 'react'
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
  GAS_RESERVE_CONSTANTS,
} from '@/lib/constants'

export type DepositStatus = 'idle' | 'signing' | 'pending' | 'confirming' | 'success' | 'error'

export function useDeposit() {
  const [status, setStatus] = useState<DepositStatus>('idle')
  const [error, setError] = useState<Error | null>(null)

  // Track the last deposit amounts for optimistic updates
  const lastDepositRef = useRef<{ payerAmount: bigint; appChainAmount: bigint } | null>(null)

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
   * Calculate deposit split to TARGET a 75/25 allocation based on current balances.
   *
   * Instead of blindly splitting each deposit 75/25, this calculates what's needed
   * to bring the TOTAL balances toward the target ratio.
   *
   * @param depositAmount Amount being deposited
   * @param currentMessaging Current messaging balance (Payer Registry)
   * @param currentGas Current gas reserve balance (Appchain)
   * @param targetMessagingPercent Target percentage for messaging (default 75%)
   * @returns Object with payerAmount and appChainAmount
   */
  const calculateTargetedSplit = useCallback((
    depositAmount: bigint,
    currentMessaging: bigint,
    currentGas: bigint,
    targetMessagingPercent: bigint = 100n - GAS_RESERVE_CONSTANTS.defaultGasRatioPercent
  ) => {
    const targetGasPercent = 100n - targetMessagingPercent

    // Calculate what totals will be after deposit
    const totalAfter = currentMessaging + currentGas + depositAmount

    // Calculate target balances
    const targetMessaging = (totalAfter * targetMessagingPercent) / 100n
    const targetGas = (totalAfter * targetGasPercent) / 100n

    // Calculate how much each bucket needs to reach target
    const messagingDelta = targetMessaging > currentMessaging
      ? targetMessaging - currentMessaging
      : 0n
    const gasDelta = targetGas > currentGas
      ? targetGas - currentGas
      : 0n

    // If messaging is already over target, all goes to gas
    if (messagingDelta === 0n) {
      return { payerAmount: 0n, appChainAmount: depositAmount }
    }

    // If gas is already over target, all goes to messaging
    if (gasDelta === 0n) {
      return { payerAmount: depositAmount, appChainAmount: 0n }
    }

    // Both need funds - deltas should sum to depositAmount
    // (math guarantees this when both are positive)
    return { payerAmount: messagingDelta, appChainAmount: gasDelta }
  }, [])

  const deposit = useCallback(
    async (
      amountString: string,
      currentMessaging: bigint,
      currentGas: bigint
    ) => {
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

      // Calculate the targeted split based on current balances
      const { payerAmount, appChainAmount } = calculateTargetedSplit(
        amount,
        currentMessaging,
        currentGas
      )

      console.log('[Deposit] Split calculation:', {
        depositAmount: amount.toString(),
        currentMessaging: currentMessaging.toString(),
        currentGas: currentGas.toString(),
        payerAmount: payerAmount.toString(),
        appChainAmount: appChainAmount.toString(),
      })

      // Store for optimistic updates
      lastDepositRef.current = { payerAmount, appChainAmount }

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
              GATEWAY_PAYER_ADDRESS,                     // appChainRecipient - gas reserve recipient
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
    [address, walletClient, balance, writeContract, calculateTargetedSplit]
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
    lastDepositRef.current = null
  }, [])

  return {
    deposit,
    calculateTargetedSplit,
    targetMessagingPercent: 100n - GAS_RESERVE_CONSTANTS.defaultGasRatioPercent,
    targetGasPercent: GAS_RESERVE_CONSTANTS.defaultGasRatioPercent,
    status,
    error,
    isPending: isPending || isConfirming || status === 'signing',
    isSuccess,
    hash,
    balance,
    reset,
    refetchBalance,
    // Last deposit amounts for optimistic updates
    lastDeposit: lastDepositRef.current,
  }
}

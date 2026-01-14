/**
 * Message cost calculation based on XMTP rate model
 *
 * Cost = (messageFee + storageFee * bytes * days + congestionFee) * gasOverhead
 *
 * All rates are in picodollars (10^-12 dollars).
 * Balances are in 6-decimal fee token units (like USDC).
 */

// Fee estimation constants
const FALLBACK_MESSAGE_BYTES = 1024
const FALLBACK_STORAGE_DAYS = 60
const FALLBACK_GAS_OVERHEAD_ESTIMATE = 1.25

// Picodollar scale factor (10^12)
const PICODOLLAR_SCALE = 1e12

// Fee token decimals
const FEE_TOKEN_DECIMALS = 6

// Fallback rates (in picodollars) when we can't fetch from chain
const FALLBACK_MESSAGE_FEE = 38_500_000n // ~$0.0000385
const FALLBACK_STORAGE_FEE = 22n // ~$0.000000000022 per byte per day
const FALLBACK_CONGESTION_FEE = 0n

export interface CostCalculationResult {
  /** Cost per message in dollars */
  costPerMessage: number
  /** Messages available given balance */
  messagesAvailable: number
  /** Formatted messages available (e.g., "20,000") */
  formattedMessages: string
  /** Formatted balance in dollars (e.g., "$1.00") */
  formattedBalance: string
}

/**
 * Calculate messages available from a balance.
 * Uses fallback rates - a production app would fetch from RateRegistry.
 *
 * @param balance - Payer balance in fee token units (6 decimals, like USDC)
 * @returns Calculation result with messages available and formatting
 */
export function calculateMessagesAvailable(
  balance: bigint | undefined | null
): CostCalculationResult {
  // Handle no balance
  if (!balance || balance <= 0n) {
    return {
      costPerMessage: 0,
      messagesAvailable: 0,
      formattedMessages: '0',
      formattedBalance: '$0.00',
    }
  }

  // Calculate storage component: storageFee * bytes * days
  const storageComponent =
    FALLBACK_STORAGE_FEE * BigInt(FALLBACK_MESSAGE_BYTES) * BigInt(FALLBACK_STORAGE_DAYS)

  // Calculate base cost: messageFee + storageComponent + congestionFee
  const baseCostPicodollars = FALLBACK_MESSAGE_FEE + storageComponent + FALLBACK_CONGESTION_FEE

  // Apply gas overhead estimate multiplier
  const totalCostPicodollars = BigInt(
    Math.round(Number(baseCostPicodollars) * FALLBACK_GAS_OVERHEAD_ESTIMATE)
  )

  // Convert picodollars to dollars
  const costPerMessage = Number(totalCostPicodollars) / PICODOLLAR_SCALE

  // Convert balance from fee token units to dollars
  // Balance is in 6-decimal units, so divide by 10^6 to get dollars
  const balanceDollars = Number(balance) / Math.pow(10, FEE_TOKEN_DECIMALS)

  // Calculate messages available
  const messagesAvailable = Math.floor(balanceDollars / costPerMessage)

  // Format messages with thousands separator
  const formattedMessages = messagesAvailable.toLocaleString()

  // Format balance as currency
  const formattedBalance = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(balanceDollars)

  return {
    costPerMessage,
    messagesAvailable,
    formattedMessages,
    formattedBalance,
  }
}

/**
 * Get warning level based on messages remaining
 */
export function getBalanceWarningLevel(
  messagesAvailable: number
): 'none' | 'low' | 'critical' {
  if (messagesAvailable < 10) return 'critical'
  if (messagesAvailable < 100) return 'low'
  return 'none'
}

export interface MessageCostResult {
  /** Cost in dollars */
  cost: number
  /** Cost formatted as currency (e.g., "$0.00005") */
  formattedCost: string
  /** Cost breakdown components */
  breakdown: {
    messageFee: number
    storageFee: number
    total: number
  }
}

/**
 * Calculate cost for a specific message based on its byte length.
 * Uses fallback rates - a production app would fetch from RateRegistry.
 *
 * @param messageBytes - Size of the message in bytes
 * @param storageDays - How long the message is stored (default: 60 days)
 * @returns Cost calculation result with breakdown
 */
export function calculateMessageCost(
  messageBytes: number,
  storageDays: number = FALLBACK_STORAGE_DAYS
): MessageCostResult {
  // Calculate storage component: storageFee * bytes * days
  const storageComponent = FALLBACK_STORAGE_FEE * BigInt(messageBytes) * BigInt(storageDays)

  // Calculate base cost: messageFee + storageComponent + congestionFee
  const baseCostPicodollars = FALLBACK_MESSAGE_FEE + storageComponent + FALLBACK_CONGESTION_FEE

  // Apply gas overhead estimate multiplier
  const totalCostPicodollars = BigInt(
    Math.round(Number(baseCostPicodollars) * FALLBACK_GAS_OVERHEAD_ESTIMATE)
  )

  // Convert to dollars
  const messageFee = Number(FALLBACK_MESSAGE_FEE) / PICODOLLAR_SCALE
  const storageFee = Number(storageComponent) / PICODOLLAR_SCALE
  const total = Number(totalCostPicodollars) / PICODOLLAR_SCALE

  // Format cost - use more decimal places for small amounts
  const formattedCost = formatMicroCost(total)

  return {
    cost: total,
    formattedCost,
    breakdown: {
      messageFee,
      storageFee,
      total,
    },
  }
}

/**
 * Format very small dollar amounts (microdollars)
 * Shows appropriate precision based on magnitude
 */
export function formatMicroCost(amount: number): string {
  if (amount < 0.0001) {
    // For very small amounts, use scientific notation or fixed decimals
    return `$${amount.toFixed(7)}`
  } else if (amount < 0.01) {
    return `$${amount.toFixed(5)}`
  } else if (amount < 1) {
    return `$${amount.toFixed(4)}`
  } else {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }
}

/**
 * Get the byte length of a message text
 */
export function getMessageBytes(text: string): number {
  return new TextEncoder().encode(text).length
}

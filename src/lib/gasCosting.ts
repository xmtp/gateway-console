/**
 * Gas cost calculation for XMTP Appchain operations
 *
 * Gas fees are paid from the Gas Reserve on the XMTP Appchain.
 * These cover on-chain operations like group membership changes
 * and identity updates that require strict ordering.
 *
 * All calculations use xUSD (18 decimals) as the native token.
 */

// Fee token decimals (xUSD native token uses 18 decimals)
const FEE_TOKEN_DECIMALS = 18

// Estimated gas costs per operation (in gas units)
// Based on actual on-chain observations from XMTP Ropsten testnet
// Note: Group message operations vary significantly based on content size
const GAS_ESTIMATES = {
  // Group operations (via GroupMessageBroadcaster)
  // Small message: ~93K, Large message: ~2.7M - using median estimate
  createGroup: 500_000n,
  addMember: 200_000n,
  removeMember: 150_000n,
  updateMetadata: 100_000n,
  // Identity operations (via IdentityUpdateBroadcaster) - observed ~62K
  linkWallet: 65_000n,
  unlinkWallet: 65_000n,
} as const

export type GasOperationType = keyof typeof GAS_ESTIMATES

// Gas price on XMTP Appchain: 0.1 Gwei = 0.0000000001 xUSD per gas unit
// This is the actual observed gas price from on-chain transactions
const XUSD_PER_GAS_UNIT = 0.0000000001

export interface GasOperationCost {
  /** Operation type */
  operation: GasOperationType
  /** Estimated gas units */
  gasUnits: bigint
  /** Estimated cost in xUSD (6 decimals) */
  costXusd: bigint
  /** Estimated cost in dollars */
  costDollars: number
  /** Formatted cost string */
  formattedCost: string
  /** Human-readable description */
  description: string
}

export interface GasReserveCalculation {
  /** Balance in xUSD (6 decimals) */
  balance: bigint
  /** Balance in dollars */
  balanceDollars: number
  /** Formatted balance */
  formattedBalance: string
  /** Estimated operations available (based on average operation cost) */
  operationsAvailable: number
  /** Formatted operations available */
  formattedOperations: string
  /** Warning level */
  warningLevel: 'none' | 'low' | 'critical'
}

const OPERATION_DESCRIPTIONS: Record<GasOperationType, string> = {
  createGroup: 'Create new group',
  addMember: 'Add member to group',
  removeMember: 'Remove member from group',
  updateMetadata: 'Update group metadata',
  linkWallet: 'Link wallet to identity',
  unlinkWallet: 'Unlink wallet from identity',
}

/**
 * Calculate the estimated cost for a specific gas operation
 */
export function calculateGasOperationCost(operation: GasOperationType): GasOperationCost {
  const gasUnits = GAS_ESTIMATES[operation]
  const costDollars = Number(gasUnits) * XUSD_PER_GAS_UNIT

  // Convert to 6-decimal xUSD units
  const costXusd = BigInt(Math.round(costDollars * Math.pow(10, FEE_TOKEN_DECIMALS)))

  return {
    operation,
    gasUnits,
    costXusd,
    costDollars,
    formattedCost: formatGasCost(costDollars),
    description: OPERATION_DESCRIPTIONS[operation],
  }
}

/**
 * Calculate operations available from a gas reserve balance
 */
export function calculateOperationsAvailable(
  balance: bigint | undefined | null
): GasReserveCalculation {
  // Handle no balance
  if (!balance || balance <= 0n) {
    return {
      balance: 0n,
      balanceDollars: 0,
      formattedBalance: '$0.00',
      operationsAvailable: 0,
      formattedOperations: '0',
      warningLevel: 'critical',
    }
  }

  // Convert balance to dollars
  const balanceDollars = Number(balance) / Math.pow(10, FEE_TOKEN_DECIMALS)

  // Calculate average operation cost (weighted towards common operations)
  const avgCost = (
    calculateGasOperationCost('createGroup').costDollars * 0.2 +
    calculateGasOperationCost('addMember').costDollars * 0.4 +
    calculateGasOperationCost('removeMember').costDollars * 0.4
  )

  // Calculate operations available
  const operationsAvailable = avgCost > 0 ? Math.floor(balanceDollars / avgCost) : 0

  // Determine warning level
  let warningLevel: 'none' | 'low' | 'critical' = 'none'
  if (operationsAvailable < 10) {
    warningLevel = 'critical'
  } else if (operationsAvailable < 100) {
    warningLevel = 'low'
  }

  return {
    balance,
    balanceDollars,
    formattedBalance: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(balanceDollars),
    operationsAvailable,
    formattedOperations: formatOperationsCount(operationsAvailable),
    warningLevel,
  }
}

/**
 * Format a gas cost for display
 * Shows appropriate precision based on magnitude
 */
export function formatGasCost(costDollars: number): string {
  if (costDollars === 0) return '$0'

  // For very small costs, show more decimal places
  if (costDollars < 0.0001) {
    return `$${costDollars.toFixed(6)}`
  }
  if (costDollars < 0.01) {
    return `$${costDollars.toFixed(5)}`
  }
  if (costDollars < 1) {
    return `$${costDollars.toFixed(4)}`
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(costDollars)
}

/**
 * Format operations count with appropriate suffix
 */
function formatOperationsCount(count: number): string {
  if (count >= 1_000_000) {
    return `~${(count / 1_000_000).toFixed(1)}M`
  }
  if (count >= 1_000) {
    return `~${(count / 1_000).toFixed(1)}K`
  }
  return `~${count.toLocaleString()}`
}

/**
 * Get the gas estimates object for reference
 */
export function getGasEstimates() {
  return GAS_ESTIMATES
}

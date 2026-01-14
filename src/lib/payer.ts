import { privateKeyToAccount } from 'viem/accounts'
import type { Address, Hex } from 'viem'

/**
 * Derive the gateway payer address from a private key.
 * This is the address where deposits should be sent.
 */
export function derivePayerAddress(privateKey: Hex): Address {
  const account = privateKeyToAccount(privateKey)
  return account.address
}

/**
 * Get the gateway payer address from environment.
 * Falls back to undefined if not set.
 */
export function getGatewayPayerAddress(): Address | undefined {
  const address = import.meta.env.VITE_GATEWAY_PAYER_ADDRESS
  if (!address || address === '0x...') {
    return undefined
  }
  return address as Address
}

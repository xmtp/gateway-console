import type { Hex, Address } from 'viem'

export interface EphemeralUser {
  id: string           // Random UUID (crypto.randomUUID())
  name: string         // Display name (e.g., "Alice")
  privateKey: Hex      // secp256k1 private key
  address: Address     // Derived Ethereum address
  createdAt: number    // Timestamp
}

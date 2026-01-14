// Simplified ABI - only getBalance function needed
export const PayerRegistryAbi = [
  {
    type: 'function',
    name: 'getBalance',
    inputs: [{ name: 'payer_', type: 'address', internalType: 'address' }],
    outputs: [{ name: 'balance_', type: 'int104', internalType: 'int104' }],
    stateMutability: 'view',
  },
] as const

import { defineChain } from 'viem'
import { XMTP_CHAIN_ID, XMTP_APPCHAIN_RPC_URL } from './constants'

/**
 * XMTP Appchain (L3) configuration
 *
 * An Arbitrum Orbit L3 rollup that settles onto Base.
 * Uses xUSD as the native token for gas fees.
 */
export const xmtpAppchain = defineChain({
  id: XMTP_CHAIN_ID,
  name: 'XMTP Testnet',
  iconUrl: '/xmtp-icon.svg',
  iconBackground: '#000000',
  nativeCurrency: {
    name: 'XMTP USD',
    symbol: 'xUSD',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [XMTP_APPCHAIN_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: 'XMTP Explorer',
      url: 'https://explorer.testnet.xmtp.org', // Placeholder - update when available
    },
  },
  testnet: true,
})

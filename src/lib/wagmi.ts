import '@rainbow-me/rainbowkit/styles.css'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  metaMaskWallet,
  baseAccount,
  walletConnectWallet,
  rainbowWallet,
  uniswapWallet,
  phantomWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { createConfig, http } from 'wagmi'
import { base, baseSepolia, mainnet } from 'wagmi/chains'
import { SETTLEMENT_CHAIN_RPC_URL, MAINNET_RPC_URL, BASE_MAINNET_RPC_URL } from './constants'
import { xmtpAppchain } from './chains'

const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID

if (!walletConnectProjectId) {
  throw new Error(
    'Missing VITE_WALLETCONNECT_PROJECT_ID environment variable. ' +
    'Get a free project ID at https://cloud.walletconnect.com and add it to .env.local'
  )
}

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Popular',
      wallets: [
        metaMaskWallet,
        baseAccount,
        uniswapWallet,
        rainbowWallet,
        phantomWallet,
      ],
    },
    {
      groupName: 'More',
      wallets: [walletConnectWallet],
    },
  ],
  {
    appName: 'XMTP Gateway Console',
    projectId: walletConnectProjectId,
  }
)

export const config = createConfig({
  connectors,
  chains: [base, baseSepolia, mainnet, xmtpAppchain],
  transports: {
    [baseSepolia.id]: http(SETTLEMENT_CHAIN_RPC_URL),
    [base.id]: http(BASE_MAINNET_RPC_URL),
    [mainnet.id]: http(MAINNET_RPC_URL),
    [xmtpAppchain.id]: http(xmtpAppchain.rpcUrls.default.http[0]),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}

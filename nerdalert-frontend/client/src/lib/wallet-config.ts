import { createWeb3Modal } from '@web3modal/wagmi/react'
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'
import { WagmiProvider } from 'wagmi'
import { arbitrum, mainnet, polygon, base, optimism } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// 🔑 Get your Project ID from https://cloud.walletconnect.com
// 1. Go to https://cloud.walletconnect.com
// 2. Sign up/login and create a new project
// 3. Copy your Project ID and replace this placeholder
const projectId = '84d9f66af3cb6c54297d3995d1c1920f' // ← Replace with your real Project ID

const metadata = {
  name: 'NerdAlert Crypto Agent',
  description: 'Chat with NerdAlert AI Agent - Now with Ethereum wallet integration',
  url: window.location.origin, // origin must match your domain & subdomain
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

const chains = [mainnet, polygon, arbitrum, base, optimism] as const
export const config = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  enableWalletConnect: true, // Optional - true by default
  enableInjected: true, // Optional - true by default
  enableEIP6963: true, // Optional - true by default
  enableCoinbase: true, // Optional - true by default
})

// Create modal
if (import.meta.env.VITE_SHOW_WALLET !== 'false') {
  createWeb3Modal({
    wagmiConfig: config,
    projectId,
    enableAnalytics: true, // Optional - defaults to your Cloud configuration
    enableOnramp: true // Optional - false as default
  });
}

export { projectId }
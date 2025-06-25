import { useAccount, useDisconnect } from 'wagmi'
import { Button } from "@/components/ui/button"

export default function WalletButton() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center space-x-2">
        <div className="text-xs terminal-font text-neon-green">
          {formatAddress(address)}
        </div>
        <Button
          onClick={() => disconnect()}
          variant="ghost"
          size="sm"
          className="text-neon-cyan hover:text-neon-magenta hover:bg-cyber-gray border border-neon-cyan text-xs"
        >
          DISCONNECT
        </Button>
      </div>
    )
  }

  return (
    <w3m-button />
  )
}
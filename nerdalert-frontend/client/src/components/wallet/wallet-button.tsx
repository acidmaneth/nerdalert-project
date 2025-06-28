import { useAccount, useDisconnect } from 'wagmi'
import { Button } from "@/components/ui/button"
import { useEffect } from 'react'

export default function WalletButton() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  // Apply custom CSS variables for w3m-button styling
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      w3m-button {
        --w3m-font-family: 'Courier New', monospace !important;
        --w3m-accent: #00ff00 !important;
        --w3m-background-color: #0a0a0a !important;
        --w3m-foreground-color: #1a1a1a !important;
        --w3m-border-radius: 4px !important;
        --w3m-font-size-master: 12px !important;
        --w3m-overlay-background-color: rgba(0, 0, 0, 0.8) !important;
      }
      
      w3m-button button {
        background: #00ff00 !important;
        border: 1px solid #00ff00 !important;
        color: #000000 !important;
        font-family: 'Courier New', monospace !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.5px !important;
        padding: 6px 12px !important;
        transition: all 0.2s ease !important;
        border-radius: 4px !important;
        box-shadow: 0 0 5px rgba(0, 255, 0, 0.3) !important;
      }
      
      w3m-button button:hover {
        background: #00cc00 !important;
        color: #000000 !important;
        box-shadow: 0 0 15px rgba(0, 255, 0, 0.6) !important;
        transform: translateY(-1px) !important;
      }
      
      w3m-button button span {
        color: #000000 !important;
        font-family: 'Courier New', monospace !important;
      }
    `;
    
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (isConnected && address) {
    return (
      <div className="flex items-center space-x-2">
        <div className="text-xs terminal-font text-neon-green bg-cyber-dark border border-neon-green px-2 py-1 rounded">
          🔗 {formatAddress(address)}
        </div>
        <Button
          onClick={() => disconnect()}
          size="sm"
          className="cyber-button text-xs terminal-font bg-cyber-dark border-neon-magenta text-neon-magenta hover:bg-neon-magenta hover:text-cyber-dark transition-all duration-200 px-3 py-1"
        >
          DISCONNECT
        </Button>
      </div>
    )
  }

  return (
    <div className="cyber-wallet-button">
      <w3m-button />
    </div>
  )
}
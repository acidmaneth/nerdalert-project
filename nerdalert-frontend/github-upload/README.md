# NerdAlert Cyberpunk AI Chat Interface

![NerdAlert Logo](attached_assets/NerdAlert3800_1750831460413.png)

**CryptoAgent #3800 Ethereum Mainnet**

A cyberpunk-themed chat interface for the NerdAlert AI agent with Ethereum wallet integration and pixel art design.

## Features

- 🎨 Cyberpunk pixel art design with neon colors and animations
- 🤖 Real-time chat with NerdAlert AI agent
- 💰 WalletConnect integration for Ethereum wallets
- 📱 Mobile-responsive design
- 🔄 Sidebar chat management with new chat functionality
- ⚡ Fast, lightweight architecture with in-memory storage

## Live Demo

[Deploy on Replit](https://replit.com) or visit the live demo (coming soon)

## Quick Start

### Option 1: Deploy on Replit (Recommended)

1. **Fork this repository**
2. **Import to Replit**
3. **Configure your AI backend:**
   - Set `NERDALERT_API_URL` in Replit Secrets
   - Options: EternalAI network, cloud deployment, or local with ngrok
4. **Add WalletConnect Project ID:**
   - Get free ID from [WalletConnect Cloud](https://cloud.walletconnect.com)
   - Replace in `client/src/lib/wallet-config.ts`
5. **Deploy** - Click the Deploy button in Replit

### Option 2: Local Development

```bash
git clone https://github.com/acidmaneth/nerdalert-frontend.git
cd nerdalert-frontend
npm install
npm run dev
```

## Architecture

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Node.js + Express (API proxy)
- **Storage**: In-memory (no database required)
- **Styling**: Tailwind CSS + Custom cyberpunk theme
- **UI Components**: Radix UI via shadcn/ui
- **Wallet**: WalletConnect/Wagmi for Ethereum integration

## AI Backend Options

### EternalAI Network (Recommended)
Deploy your NerdAlert agent on the decentralized EternalAI network:
- 24/7 availability without keeping your machine on
- Automatic scaling and redundancy
- Pay-per-use model
- Set `NERDALERT_API_URL` to your EternalAI endpoint

### Local Development with Tunnel
For testing with your local agent:
1. Start your NerdAlert agent locally (port 80)
2. Create tunnel: `ngrok http 80`
3. Set `NERDALERT_API_URL` to your ngrok URL

### Traditional Cloud
Deploy your agent to Railway, Render, Fly.io, etc.

## Configuration

### Environment Variables

```bash
NERDALERT_API_URL=https://your-agent-endpoint.com
```

### WalletConnect Setup

Replace the placeholder in `client/src/lib/wallet-config.ts`:

```typescript
export const config = defaultWagmiConfig({
  chains,
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Get from https://cloud.walletconnect.com
  metadata: {
    name: 'NerdAlert Chat',
    description: 'Cyberpunk AI Chat Interface',
    url: 'https://your-domain.com',
    icons: ['https://your-domain.com/icon.png']
  }
});
```

## API Contract

Your NerdAlert agent should expose a `/prompt-sync` endpoint:

**Request:**
```json
{
  "messages": [
    {"role": "user", "content": "Hello NerdAlert!"}
  ]
}
```

**Response:**
```json
{
  "response": "Greetings, human! Ready to dive into some epic geek culture discussions?"
}
```

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Related Projects

- [NerdAlert Agent](https://github.com/acidmaneth/nerdalert-project) - The AI agent backend
- [EternalAI](https://github.com/eternalai-org) - Decentralized AI infrastructure

## Support

- 🐛 [Report Issues](https://github.com/acidmaneth/nerdalert-frontend/issues)
- 💬 [Discussions](https://github.com/acidmaneth/nerdalert-frontend/discussions)

---

Built with ❤️ for the cyberpunk and AI community
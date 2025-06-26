# NerdAlert Cyberpunk Chat Interface

A cyberpunk-themed chat interface for the NerdAlert AI agent with Ethereum wallet integration.

## Features

- Cyberpunk pixel art design with neon colors and animations
- Real-time chat with NerdAlert AI agent
- WalletConnect integration for Ethereum wallets
- Sidebar chat management with new chat functionality
- Mobile-responsive design
- In-memory message storage

## Deployment Options

### Option 1: EternalAI Network (Recommended)

Deploy your NerdAlert agent on the EternalAI decentralized network for 24/7 availability:

1. **Prepare your agent for EternalAI:**
   - Follow EternalAI documentation to containerize your NerdAlert agent
   - Deploy to their network using their CLI/SDK
   - Get your agent's EternalAI endpoint URL

2. **Configure this frontend:**
   - Set `NERDALERT_API_URL` to your EternalAI agent endpoint
   - Deploy this chat interface on Replit

3. **Benefits:**
   - 24/7 availability without keeping your machine on
   - Decentralized infrastructure
   - Automatic scaling and redundancy
   - Pay-per-use model

### Option 2: Traditional Cloud Deployment

1. **Deploy your NerdAlert agent separately** (Railway, Render, Fly.io, etc.)
2. **Set the API URL:**
   - Set environment variable: `NERDALERT_API_URL=https://your-agent-url.com`
3. **Deploy this frontend** on Replit

### Option 3: Local Development with Tunneling

For testing with your local agent:

1. **Expose your local agent:**
   ```bash
   # Install ngrok: https://ngrok.com/
   ngrok http 80
   ```

2. **Set the tunnel URL:**
   ```bash
   export NERDALERT_API_URL=https://your-ngrok-url.ngrok.io
   ```

## Configuration

### Environment Variables

- `NERDALERT_API_URL` - URL of your NerdAlert agent API 
  - EternalAI endpoint: `https://your-agent-id.eternalai.network`
  - Local development: `http://localhost:80` (default)
  - Traditional cloud: `https://your-deployed-agent.com`

### WalletConnect Setup

1. Get a free project ID from https://cloud.walletconnect.com
2. Replace `demo-project-id-placeholder` in `client/src/lib/wallet-config.ts`

## Local Development

```bash
npm install
npm run dev
```

The frontend will be available at http://localhost:5050

## API Integration

The frontend expects your NerdAlert agent to have a `/prompt-sync` endpoint that accepts:

```json
{
  "messages": [
    {"role": "user", "content": "Hello"}
  ]
}
```

And returns:

```json
{
  "response": "AI response text"
}
```

## Updated Environment Variables

- `NERDALERT_API_URL` - URL of your NerdAlert agent API 
  - EternalAI endpoint: `https://your-agent-id.eternalai.network`
  - Local development: `http://localhost:80` (default)
  - Traditional cloud: `https://your-deployed-agent.com`

- `VITE_API_BASE_URL` - Base URL for API requests
  - Local development: `http://localhost:80`
  - Traditional cloud: `https://your-deployed-agent.com`
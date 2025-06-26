# EAI Project - Quick Guides

#MacStudio IP
192.168.1.205

---

## 1. **Kill/Cleanup Commands (Always Run First if Needed)**

```bash
# Run the automated cleanup script (kills all relevant ports/processes)
cd /Users/acidman/EAI
./cleanup-local-ai.sh

# Manual port kills (if needed)
lsof -ti:8080 | xargs kill -9   # LocalAI backend
lsof -ti:5050 | xargs kill -9   # NerdAlert Frontend (if running on 5050)
lsof -ti:80   | xargs kill -9   # NerdAlert Agent (if running on port 80)
```

---

## 2. **QuickStart: Start the Full Stack (in order)**

### 1. **Start LocalAI backend**
```bash
cd /Users/acidman/EAI/local-ai
source local_ai/bin/activate
local-ai start --hash bafkreid5z4lddvv4qbgdlz2nqo6eumxwetwmkpesrumisx72k3ahq73zpy
```

### 2. **Start NerdAlert Agent**
```bash
cd /Users/acidman/EAI/NerdAlert/nerdalert-agent
npm run dev
```

### 3. **Start NerdAlert Frontend**
```bash
cd /Users/acidman/EAI/NerdAlert/nerdalert-frontend
npm install   # (first time only, or after updates)
npm run dev
```
- The frontend will be available at: [http://localhost:5050](http://localhost:5050) (or as specified in your config)

### 4. **(Optional) Open LocalAI Chat UI**
```bash
open /Users/acidman/EAI/local-ai/chat_ui.html
```

---

**You always need the first three running for the full NerdAlert experience.**  
The LocalAI Chat UI is just for direct model testing and is optional.

---

## 2.5. **Frontend Vercel Deployment (For Production)**

### Deploy Frontend to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repo
4. Set **Root Directory** to: `NerdAlert/nerdalert-frontend`
5. Set **Framework Preset** to: `Vite`
6. Set **Build Command** to: `npm run build`
7. Set **Output Directory** to: `dist/public`
8. Set **Install Command** to: `npm install --legacy-peer-deps --force`

### Environment Variables Setup

**For Frontend (in Vercel dashboard):**
```bash
VITE_NERDALERT_API_URL=https://nerdalert.app
VITE_WALLET_ENABLED=false
VITE_WALLET_PROJECT_ID=your_wallet_project_id_here
VITE_WALLET_METADATA_NAME=NerdAlert
VITE_WALLET_METADATA_DESCRIPTION=Your AI companion for pop-culture
VITE_WALLET_METADATA_URL=https://nerdalert.app
VITE_WALLET_METADATA_ICONS=https://nerdalert.app/favicon.ico
NODE_ENV=production
```

### Custom Domain Setup
1. In Vercel dashboard, go to Settings → Domains
2. Add your domain: `nerdalert.app`
3. Update DNS records as instructed by Vercel

### Use Cases
- **Production deployment** - Live, public access to NerdAlert frontend
- **Custom domains** - Point nerdalert.app to Vercel
- **Automatic scaling** - Vercel handles traffic spikes
- **SSL certificates** - Automatic HTTPS
- **Global CDN** - Fast loading worldwide

### Important Notes
- **Environment variables** must be set in Vercel dashboard
- **Agent stays on Cloudflare** - Frontend calls agent at nerdalert.app
- **Automatic deployments** when you push to GitHub
- **Wallet disabled by default** - Set VITE_WALLET_ENABLED=false

---

## 3. Local AI Chat UI

### Activate Environment & Start AI Model
cd /Users/acidman/EAI/local-ai
source local_ai/bin/activate
local-ai start --hash bafkreid5z4lddvv4qbgdlz2nqo6eumxwetwmkpesrumisx72k3ahq73zpy

# Kill process on port 8080
lsof -ti:8080 | xargs kill -9

### Open Chat UI
- Double-click chat_ui.html in Finder
- OR: open /Users/acidman/EAI/local-ai/chat_ui.html

### Use Chat
- Type message → press Enter
- Click 📷 to upload images
- Shift+Enter for new lines
   python3 /Users/acidman/EAI/NerdAlert/nerdalert-agent/chat.py

### Troubleshoot
- local-ai status (check if running)
- local-ai stop (then restart if needed)
- Wait 30-60 seconds for model to load

---

## 4. NerdAlert Agent

### Setup (first time only)
cd /Users/acidman/EAI/NerdAlert/nerdalert-agent
npm install

### Start Agent
npm run dev

### Use Agent
- Runs on http://localhost:80
- Send POST requests to /prompt
- Edit src/system-prompt.txt to customize personality

### Example API Call
curl --location 'http://localhost:80/prompt' \
--header 'Content-Type: application/json' \
--data '{"messages": [{"role": "user", "content": "What are the latest Marvel movie updates?"}]}'

### Customize Agent
- Edit src/system-prompt.txt for personality changes
- Modify src/prompt/index.ts for functionality
- Add new tools in src/prompt/index.ts

---

## 5. NerdAlert Frontend

### Setup (first time only)
cd /Users/acidman/EAI/NerdAlert/nerdalert-frontend
npm install

### Start Frontend
npm run dev

### Use Frontend
- Runs on http://localhost:5050 (or as configured)
- Modern React chat interface with cyberpunk theme
- WalletConnect integration for Ethereum wallets (disabled by default)
- Sidebar chat management with new chat functionality

### Configure API URL
```bash
# For local development:
VITE_NERDALERT_API_URL=http://localhost:80

# For production (Cloudflare):
VITE_NERDALERT_API_URL=https://nerdalert.app
```

### Wallet Configuration
```bash
# Disable wallet (recommended for production)
VITE_WALLET_ENABLED=false

# Or enable wallet with project ID
VITE_WALLET_ENABLED=true
VITE_WALLET_PROJECT_ID=your_wallet_project_id_here
```

### Customize Frontend
- Edit client/src/components/ for UI changes
- Modify client/src/lib/chat-api.ts for API configuration
- Update client/src/lib/wallet-config.ts for wallet settings

---

## Quick Commands (optional aliases for ~/.zshrc)
alias start-ai="cd /Users/acidman/EAI/local-ai && source local_ai/bin/activate && local-ai start --hash bafkreid5z4lddvv4qbgdlz2nqo6eumxwetwmkpesrumisx72k3ahq73zpy"
alias open-chat="open /Users/acidman/EAI/local-ai/chat_ui.html"
alias ai-status="local-ai status"
alias start-nerdalert="cd /Users/acidman/EAI/NerdAlert/nerdalert-agent && npm run dev"
alias start-frontend="cd /Users/acidman/EAI/NerdAlert/nerdalert-frontend && npm run dev"
alias cleanup-ai="cd /Users/acidman/EAI && ./cleanup-local-ai.sh" 
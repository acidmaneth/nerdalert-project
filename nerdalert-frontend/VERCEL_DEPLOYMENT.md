# 🚀 Vercel Deployment Guide for NerdAlert Frontend

## 📋 Prerequisites

Before deploying to Vercel, ensure you have:

- ✅ **GitHub repository** with your code pushed
- ✅ **Vercel account** (free tier available)
- ✅ **NerdAlert Agent** running and accessible
- ✅ **WalletConnect Project ID** (get from [WalletConnect Cloud](https://cloud.walletconnect.com))

## 🎯 Quick Deploy Options

### Option 1: Deploy from GitHub (Recommended) ⭐

**Step 1: Prepare Your Repository**
```bash
# Ensure your code is pushed to GitHub
git add .
git commit -m "Initial commit: NerdAlert AI Agent and Frontend"
git push origin main
```

**Step 2: Deploy via Vercel Dashboard**
1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**
2. **Click "New Project"**
3. **Import your GitHub repository**: `acidmaneth/nerdalert-project`
4. **Configure project settings**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `nerdalert-frontend`
   - **Build Command**: `npm run vercel-build`
   - **Output Directory**: `dist/public`
   - **Install Command**: `npm install`
5. **Click "Deploy"**

### Option 2: Deploy with Vercel CLI

**Step 1: Install Vercel CLI**
```bash
# Install globally
npm install -g vercel

# Or use npx (no installation needed)
npx vercel
```

**Step 2: Deploy**
```bash
# Navigate to frontend directory
cd nerdalert-frontend

# Deploy (follow interactive prompts)
vercel

# For production deployment
vercel --prod
```

## ⚙️ Environment Variables Configuration

### Required Environment Variables

In your **Vercel Dashboard > Project Settings > Environment Variables**, add:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_NERDALERT_API_URL` | Your NerdAlert Agent API URL | `https://b237-2600-6c50-5b3f-c6ea-a88d-ba2b-e9f8-60ed.ngrok-free.app` |
| `WALLETCONNECT_PROJECT_ID` | WalletConnect Project ID | `your_project_id_here` |
| `VITE_APP_TITLE` | App title | `NerdAlert Chat` |
| `VITE_APP_DESCRIPTION` | App description | `Cyberpunk AI Chat Interface` |
| `VITE_API_BASE_URL` | API base URL | `https://b237-2600-6c50-5b3f-c6ea-a88d-ba2b-e9f8-60ed.ngrok-free.app` |
| `VITE_SHOW_WALLET` | Show WalletConnect | `false` |

### Environment Variable Examples

#### For Local Development
```bash
NERDALERT_API_URL=http://localhost:80
WALLETCONNECT_PROJECT_ID=your_project_id_here
VITE_APP_TITLE=NerdAlert Chat (Dev)
VITE_APP_DESCRIPTION=Cyberpunk AI Chat Interface - Development
VITE_API_BASE_URL=http://localhost:80
VITE_SHOW_WALLET=false
```

#### For Production with Ngrok
```bash
VITE_NERDALERT_API_URL=https://b237-2600-6c50-5b3f-c6ea-a88d-ba2b-e9f8-60ed.ngrok-free.app
WALLETCONNECT_PROJECT_ID=your_project_id_here
VITE_APP_TITLE=NerdAlert Chat
VITE_APP_DESCRIPTION=Cyberpunk AI Chat Interface
VITE_API_BASE_URL=https://b237-2600-6c50-5b3f-c6ea-a88d-ba2b-e9f8-60ed.ngrok-free.app
VITE_SHOW_WALLET=false
```

#### For Cloud Deployment
```bash
NERDALERT_API_URL=https://your-deployed-agent.com
WALLETCONNECT_PROJECT_ID=your_project_id_here
VITE_APP_TITLE=NerdAlert Chat
VITE_APP_DESCRIPTION=Cyberpunk AI Chat Interface
VITE_API_BASE_URL=https://your-deployed-agent.com
VITE_SHOW_WALLET=false
```

### Setting Environment Variables

**Via Vercel Dashboard:**
1. Go to **Project Settings > Environment Variables**
2. Click **"Add New"**
3. Enter variable name and value
4. Select environment (Production, Preview, Development)
5. Click **"Save"**

**Via Vercel CLI:**
```bash
# Set environment variables
vercel env add NERDALERT_API_URL
vercel env add WALLETCONNECT_PROJECT_ID
vercel env add VITE_APP_TITLE
vercel env add VITE_APP_DESCRIPTION
vercel env add VITE_API_BASE_URL
vercel env add VITE_SHOW_WALLET

# Pull environment variables to local .env file
vercel env pull .env.local
```

## 🔧 Configuration Files

### vercel.json
Your project includes a pre-configured `vercel.json`:

```json
{
  "buildCommand": "npm run vercel-build",
  "outputDirectory": "dist/public",
  "framework": "vite",
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### package.json Scripts
Your `package.json` includes the necessary build scripts:

```json
{
  "scripts": {
    "vercel-build": "vite build",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "dev": "NODE_ENV=development tsx server/index.ts"
  }
}
```

## 🌐 Domain Configuration

### Default Vercel Domain
Your app will be available at: `https://your-project-name.vercel.app`

### Custom Domain Setup (Optional)

**Step 1: Add Custom Domain**
1. Go to **Vercel Dashboard > Your Project > Settings > Domains**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `nerdalert.com`)
4. Click **"Add"**

**Step 2: Configure DNS**
Vercel will provide DNS records to add to your domain provider:

| Type | Name | Value |
|------|------|-------|
| A | @ | 76.76.19.19 |
| CNAME | www | cname.vercel-dns.com |

**Step 3: Verify Domain**
- Wait for DNS propagation (up to 48 hours)
- Vercel will automatically provision SSL certificate

## 🔄 Deployment Workflow

### Automatic Deployments
- **Push to `main` branch** → Automatic production deployment
- **Create pull request** → Preview deployment with unique URL
- **Merge to `main`** → Production deployment

### Manual Deployments
```bash
# Deploy to production
vercel --prod

# Deploy preview (development)
vercel

# Deploy specific branch
vercel --prod --git-branch=feature-branch
```

### Deployment Status
Monitor deployments in:
- **Vercel Dashboard > Deployments**
- **GitHub repository** (if connected)
- **Email notifications** (if enabled)

## 🐛 Troubleshooting Guide

### Common Build Issues

#### 1. Build Fails with Dependency Errors
```bash
# Solution: Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Check in Vercel Dashboard:**
- Build logs for specific error messages
- Node.js version compatibility
- Missing dependencies in `package.json`

#### 2. Environment Variables Not Loading
**Symptoms:** API calls fail, WalletConnect doesn't work

**Solutions:**
```bash
# Verify environment variables are set
vercel env ls

# Redeploy with updated environment variables
vercel --prod
```

#### 3. API Connection Issues
**Symptoms:** Chat doesn't work, network errors

**Debug Steps:**
1. **Verify `NERDALERT_API_URL`** is correct and accessible
2. **Check CORS settings** on your agent backend
3. **Test API endpoint** directly: `curl https://your-agent-url.com/health`
4. **Check browser console** for CORS errors

#### 4. WalletConnect Issues
**Symptoms:** Wallet connection fails, project ID errors

**Debug Steps:**
1. **Verify `WALLETCONNECT_PROJECT_ID`** is set correctly
2. **Check WalletConnect Dashboard** for domain whitelist
3. **Ensure HTTPS** is enabled (Vercel provides this automatically)
4. **Test on different browsers** and devices

### Performance Issues

#### 1. Slow Loading Times
**Solutions:**
- Enable **Vercel Edge Functions** for API routes
- Optimize **image assets** and bundle size
- Use **Vercel Analytics** to identify bottlenecks

#### 2. Mobile Performance
**Solutions:**
- Test on **real mobile devices**
- Optimize **touch interactions**
- Ensure **responsive design** works correctly

### Debug Commands
```bash
# Check deployment status
vercel ls

# View deployment logs
vercel logs

# Pull latest environment variables
vercel env pull

# Test local build
npm run vercel-build
```

## 📱 Testing Checklist

### Pre-Deployment Testing
- [ ] **Local build** works: `npm run vercel-build`
- [ ] **Environment variables** are configured
- [ ] **API connectivity** tested locally
- [ ] **WalletConnect** works in development

### Post-Deployment Testing
- [ ] **Homepage loads** correctly
- [ ] **Chat interface** is functional
- [ ] **Wallet connection** works
- [ ] **Mobile responsiveness** tested
- [ ] **API calls** succeed
- [ ] **Error handling** works properly

### Cross-Browser Testing
- [ ] **Chrome** (desktop & mobile)
- [ ] **Firefox** (desktop & mobile)
- [ ] **Safari** (desktop & mobile)
- [ ] **Edge** (desktop)

## 🔒 Security Best Practices

### Environment Variables
- ✅ **Never commit** sensitive data to Git
- ✅ **Use Vercel's encrypted** environment variables
- ✅ **Rotate API keys** regularly
- ✅ **Use different keys** for development/production

### HTTPS & Headers
- ✅ **HTTPS** is automatically enabled by Vercel
- ✅ **Security headers** are configured in `vercel.json`
- ✅ **CORS** is properly configured on your agent

### Domain Security
- ✅ **Enable domain verification** for custom domains
- ✅ **Use strong SSL certificates** (automatic with Vercel)
- ✅ **Monitor for security issues** in Vercel dashboard

## 📊 Monitoring & Analytics

### Vercel Analytics
1. **Enable Analytics** in project settings
2. **Monitor performance** metrics
3. **Track user experience** data
4. **Set up alerts** for performance issues

### Custom Monitoring
```bash
# Add error tracking (example with Sentry)
npm install @sentry/react @sentry/tracing

# Add performance monitoring
npm install web-vitals
```

### Health Checks
Set up monitoring for:
- **API response times**
- **Build success rates**
- **Error rates**
- **User engagement** metrics

## 🚀 Advanced Configuration

### Edge Functions
For better performance, consider using Vercel Edge Functions:

```typescript
// api/chat.ts
export default function handler(req, res) {
  // Your API logic here
  res.status(200).json({ message: 'Hello from Edge Function!' });
}
```

### Image Optimization
Vercel automatically optimizes images. Use the `next/image` component or Vercel's image optimization:

```html
<img src="/api/image?url=your-image-url" alt="Optimized image" />
```

### Caching Strategy
Configure caching in `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

## 📞 Support & Resources

### Vercel Documentation
- [Vercel Docs](https://vercel.com/docs)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [Environment Variables Guide](https://vercel.com/docs/projects/environment-variables)

### Community Support
- [Vercel Community](https://github.com/vercel/vercel/discussions)
- [Vercel Discord](https://discord.gg/vercel)

### Project-Specific Help
- **Repository Issues**: Create an issue in your GitHub repo
- **Agent Integration**: Check your NerdAlert agent documentation
- **WalletConnect**: [WalletConnect Documentation](https://docs.walletconnect.com/)

---

## 🎉 Success Checklist

After deployment, verify:

- [ ] **App is live** at your Vercel URL
- [ ] **All features work** correctly
- [ ] **Environment variables** are set
- [ ] **Custom domain** is configured (if applicable)
- [ ] **SSL certificate** is active
- [ ] **Mobile testing** completed
- [ ] **Performance** is acceptable
- [ ] **Monitoring** is set up

**Congratulations! Your NerdAlert frontend is now deployed on Vercel! 🚀**

---

*Last updated: December 2024*
*For issues or questions, please refer to the troubleshooting section above or create an issue in the repository.* 
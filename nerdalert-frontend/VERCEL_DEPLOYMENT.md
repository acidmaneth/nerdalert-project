# Vercel Deployment Guide for NerdAlert Frontend

## 🚀 Quick Deploy to Vercel

### Option 1: Deploy from GitHub (Recommended)

1. **Push your code to GitHub** (if not already done)
2. **Go to [Vercel](https://vercel.com)** and sign in
3. **Click "New Project"**
4. **Import your GitHub repository**: `acidmaneth/nerdalert-project`
5. **Configure the project**:
   - **Framework Preset**: Vite
   - **Root Directory**: `nerdalert-frontend`
   - **Build Command**: `npm run vercel-build`
   - **Output Directory**: `dist/public`
   - **Install Command**: `npm install`

### Option 2: Deploy with Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend directory
cd nerdalert-frontend

# Deploy
vercel

# Follow the prompts to configure your deployment
```

## ⚙️ Environment Variables Setup

### Required Environment Variables

In your Vercel project dashboard, go to **Settings > Environment Variables** and add:

```bash
# Your NerdAlert Agent API URL
NERDALERT_API_URL=https://your-agent-domain.com

# WalletConnect Project ID (get from https://cloud.walletconnect.com)
WALLETCONNECT_PROJECT_ID=your_project_id_here

# App Configuration
VITE_APP_TITLE=NerdAlert Chat
VITE_APP_DESCRIPTION=Cyberpunk AI Chat Interface
```

### Environment Variable Options

#### For Local Development
```bash
NERDALERT_API_URL=http://localhost:80
```

#### For Production with Ngrok
```bash
NERDALERT_API_URL=https://your-ngrok-url.ngrok.io
```

#### For Cloud Deployment
```bash
NERDALERT_API_URL=https://your-deployed-agent.com
```

## 🔧 Configuration Files

### vercel.json
The project includes a `vercel.json` file with:
- Build configuration for Vite
- SPA routing (all routes serve index.html)
- Security headers
- Production environment settings

### package.json
Updated with:
- `vercel-build` script for Vercel deployment
- Proper project name and metadata
- All necessary dependencies

## 🌐 Domain Configuration

### Custom Domain (Optional)
1. **Go to Vercel Dashboard > Your Project > Settings > Domains**
2. **Add your custom domain**
3. **Update DNS records** as instructed by Vercel

### Default Vercel Domain
Your app will be available at: `https://your-project-name.vercel.app`

## 🔄 Deployment Workflow

### Automatic Deployments
- **Push to main branch** → Automatic deployment
- **Create pull request** → Preview deployment
- **Merge to main** → Production deployment

### Manual Deployments
```bash
# Deploy to production
vercel --prod

# Deploy preview
vercel
```

## 🐛 Troubleshooting

### Common Issues

1. **Build Fails**
   - Check that all dependencies are in `package.json`
   - Verify Node.js version compatibility
   - Check build logs in Vercel dashboard

2. **API Connection Issues**
   - Verify `NERDALERT_API_URL` is correct
   - Ensure your agent is running and accessible
   - Check CORS settings on your agent

3. **WalletConnect Issues**
   - Verify `WALLETCONNECT_PROJECT_ID` is set
   - Check that the project ID is valid
   - Ensure domain is whitelisted in WalletConnect dashboard

### Debug Steps
1. **Check Vercel build logs** in the dashboard
2. **Verify environment variables** are set correctly
3. **Test API connectivity** from Vercel's serverless functions
4. **Check browser console** for client-side errors

## 📱 Mobile Testing

After deployment:
1. **Test on mobile devices** using your Vercel URL
2. **Verify WalletConnect** works on mobile browsers
3. **Check responsive design** on different screen sizes

## 🔒 Security Considerations

- **Environment variables** are encrypted in Vercel
- **HTTPS** is automatically enabled
- **Security headers** are configured in `vercel.json`
- **CORS** should be configured on your agent backend

## 📊 Monitoring

### Vercel Analytics
- **Enable Vercel Analytics** in project settings
- **Monitor performance** and user experience
- **Track deployment success** rates

### Custom Monitoring
- **Add error tracking** (Sentry, LogRocket, etc.)
- **Monitor API response times**
- **Track user engagement** metrics

## 🚀 Next Steps

After successful deployment:
1. **Test all features** thoroughly
2. **Configure custom domain** (optional)
3. **Set up monitoring** and analytics
4. **Share your live app** with users!

---

**Need help?** Check the [Vercel Documentation](https://vercel.com/docs) or create an issue in the repository. 
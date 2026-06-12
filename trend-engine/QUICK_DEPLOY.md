# Quick Deploy in 15 Minutes

**For detailed steps, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**

## Prerequisites
- GitHub account
- Domain name (from Namecheap, Google Domains, etc.)
- API keys (YouTube, X, Anthropic, OpenAI) - already in your `.env`

---

## Step 1: GitHub (2 min)

```bash
cd "/Users/ajay/Documents/Lor Idea Engine"

# Create repo at github.com/YOUR_USERNAME/lor-trend-engine
# Then:

git remote set-url origin https://github.com/YOUR_USERNAME/lor-trend-engine.git
git branch -M main
git push -u origin main
```

✅ **Verify:** Visit github.com/YOUR_USERNAME/lor-trend-engine

---

## Step 2: Vercel Frontend (3 min)

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. "Add New Project" → Select `lor-trend-engine` → "Import"
4. Add environment variable:
   ```
   NEXT_PUBLIC_API_BASE_URL = https://api.yourdomain.com
   ```
5. Click "Deploy"

✅ **Verify:** Copy the Vercel URL from dashboard (e.g., `lor-trend-engine.vercel.app`)

---

## Step 3: Railway Backend (5 min)

1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. "New Project" → "Deploy from GitHub repo" → Select `lor-trend-engine`
4. Go to "Variables" tab → Add these:
   ```
   YOUTUBE_API_KEY=your_key
   YOUTUBE_CHANNEL_ID=your_id
   X_BEARER_TOKEN=your_token
   ANTHROPIC_API_KEY=your_key
   OPENAI_API_KEY=your_key
   CORS_ORIGIN=https://yourdomain.com
   ```
5. Railway auto-deploys

✅ **Verify:** Test API:
```bash
curl https://YOUR_RAILWAY_URL/api/health
# Should return: {"status":"ok"}
```

---

## Step 4: Custom Domain (5 min)

### Frontend (Vercel)
1. Vercel Dashboard → Your Project → "Settings" → "Domains"
2. Add: `yourdomain.com`
3. Follow DNS instructions (Vercel provides nameservers)

### Backend (Railway)
1. Railway Dashboard → Your Project → "Domain"
2. Add: `api.yourdomain.com`
3. Follow DNS instructions

### Update DNS at Registrar
In Namecheap/Google Domains/GoDaddy:
1. Go to DNS settings
2. Add nameservers (from Vercel) OR add DNS records
3. Wait 24-48 hours

### Update Environment Variables
**Vercel:**
- Set `NEXT_PUBLIC_API_BASE_URL = https://api.yourdomain.com`
- Redeploy

**Railway:**
- Set `CORS_ORIGIN = https://yourdomain.com`
- Redeploy

---

## Step 5: Test Everything (1 min)

```bash
# Test frontend
curl https://yourdomain.com

# Test backend
curl https://api.yourdomain.com/api/health

# Test in browser
# 1. Visit https://yourdomain.com
# 2. Settings → Verify all API keys show "Configured"
# 3. Home → Click "Search Now" → Wait for results
```

✅ **Done!** Your app is live!

---

## Future Deployments (Automatic!)

Just push to GitHub:
```bash
git add .
git commit -m "Your message"
git push origin main
```

Vercel and Railway auto-deploy within 2-5 minutes. No manual steps needed!

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **Can't reach domain** | DNS not propagated yet (wait 24-48 hours) |
| **Search returns 500** | Check Railway logs for API key issues |
| **CORS error** | Update `CORS_ORIGIN` in Railway env vars |
| **Frontend won't load** | Check Vercel logs in dashboard |

---

## Cost Estimate

- **GitHub:** Free
- **Vercel:** Free (up to 100GB bandwidth)
- **Railway:** ~$5/month (includes free credits)
- **Domain:** ~$10-15/year
- **API Keys:** Free tiers (or $0-50/month if scaled)

**Total: ~$20-80/year for hobby usage**

---

## What's Deployed?

✅ Frontend (Next.js) → Vercel (CDN globally distributed)
✅ Backend (FastAPI) → Railway (auto-scaling container)
✅ Database → In-memory (sample data) - upgrade later if needed
✅ API Keys → Secure env vars (never in code)
✅ Custom Domain → Both frontend and backend subdomain
✅ Auto-deployments → Push to GitHub → Live in 2-5 min

---

For more details, see **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**

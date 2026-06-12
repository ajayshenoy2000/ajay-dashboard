# Deployment Guide: L'or Trend Engine

Deploy your app to GitHub, Vercel (frontend), and a backend host, with your custom domain.

---

## **PART 1: GitHub Setup**

### Step 1: Create GitHub Repository
1. Go to [github.com/new](https://github.com/new)
2. Name: `lor-trend-engine` (or your preferred name)
3. Description: "Japanese beauty trend intelligence dashboard"
4. Make it **Public** (for Vercel integration)
5. Click "Create repository"

### Step 2: Push Code to GitHub
```bash
cd "/Users/ajay/Documents/Lor Idea Engine"

# Add remote (replace YOUR_USERNAME and repo name)
git remote set-url origin https://github.com/YOUR_USERNAME/lor-trend-engine.git

# Or if no remote exists:
git remote add origin https://github.com/YOUR_USERNAME/lor-trend-engine.git

# Push all branches
git branch -M main
git push -u origin main
```

### Step 3: Verify on GitHub
- Visit `https://github.com/YOUR_USERNAME/lor-trend-engine`
- You should see all files except `.env` and `/data` (thanks to `.gitignore`)

---

## **PART 2: Frontend Deployment (Vercel)**

Vercel is perfect for Next.js and has free tier + automatic deployments.

### Step 1: Sign Up for Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up" → "Continue with GitHub"
3. Authorize Vercel to access your GitHub account

### Step 2: Import Your Project
1. Dashboard → "Add New..." → "Project"
2. Select your GitHub repo `lor-trend-engine`
3. Click "Import"

### Step 3: Configure Environment Variables
In the Vercel dashboard project settings:

**Add these env vars:**
```
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
```

(We'll set up the backend URL after deploying the backend)

### Step 4: Deploy
- Click "Deploy"
- Wait ~2-3 minutes
- Vercel will give you a temporary URL like `lor-trend-engine.vercel.app`

**Test it:** Visit the Vercel URL to confirm frontend loads

---

## **PART 3: Backend Deployment (Railway or Render)**

Choose one based on preference:

### **OPTION A: Railway (Recommended - Simple)**

#### Step 1: Sign Up
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub

#### Step 2: Create New Project
1. Dashboard → "New Project"
2. "Deploy from GitHub repo"
3. Select `lor-trend-engine`

#### Step 3: Configure
1. Railway auto-detects Python project
2. In "Variables" tab, add environment variables:
```
YOUTUBE_API_KEY=your_youtube_key
YOUTUBE_CHANNEL_ID=your_channel_id
X_BEARER_TOKEN=your_x_token
ANTHROPIC_API_KEY=your_claude_key
OPENAI_API_KEY=your_gpt_key
CORS_ORIGIN=https://yourdomain.com
```

#### Step 4: Create requirements.txt
Railway needs a `requirements.txt` in root. Create if missing:
```bash
cd "/Users/ajay/Documents/Lor Idea Engine"
cat > requirements.txt << 'EOF'
fastapi==0.104.1
uvicorn==0.24.0
python-dotenv==1.0.0
requests==2.31.0
google-auth-oauthlib==1.2.0
google-auth-httplib2==0.2.0
google-api-python-client==2.106.0
isodate==0.6.1
httpx==0.25.2
tweepy==4.14.0
anthropic==0.25.0
openai==1.3.0
pydantic==2.5.0
EOF
```

#### Step 5: Create Procfile
```bash
echo 'web: uvicorn backend.main:app --host 0.0.0.0 --port $PORT' > Procfile
```

#### Step 6: Deploy
- Commit and push changes
- Railway auto-deploys
- You get a Railway URL like `lor-trend-engine-production.up.railway.app`

---

### **OPTION B: Render (Alternative)**

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. New → "Web Service"
4. Select your repo
5. **Runtime:** Python
6. **Build Command:** `pip install -r requirements.txt`
7. **Start Command:** `uvicorn backend.main:app --host 0.0.0.0 --port 8000`
8. Add environment variables (same as Railway)
9. Click "Create Web Service"

---

## **PART 4: Connect Frontend to Backend**

Once backend is deployed:

### Step 1: Get Backend URL
- **Railway:** From dashboard, copy the URL from "Deployments"
- **Render:** From dashboard, copy the URL from "Settings"
- Example: `https://lor-trend-engine-production.up.railway.app`

### Step 2: Update Vercel Env Vars
1. Vercel Dashboard → Your Project → "Settings" → "Environment Variables"
2. Update `NEXT_PUBLIC_API_BASE_URL` to your backend URL
3. Redeploy:
   - Dashboard → "Deployments"
   - Click latest deploy
   - Click "Redeploy"

### Step 3: Test Connection
Visit your Vercel frontend and test "Search Now" → should connect to backend

---

## **PART 5: Custom Domain Setup**

### Step 1: Buy Domain
Options:
- [Namecheap](https://namecheap.com)
- [Google Domains](https://domains.google)
- [GoDaddy](https://godaddy.com)

Example: `lortrendengine.com`

### Step 2: Add Domain to Vercel
1. Vercel Dashboard → Your Project → "Settings" → "Domains"
2. Click "Add Domain"
3. Type your domain: `lortrendengine.com`
4. Vercel gives you nameservers or DNS records to add

### Step 3: Update DNS at Registrar
In your domain registrar (Namecheap/Google Domains):
1. Go to DNS settings
2. Add Vercel's nameservers OR DNS records (follow Vercel's instructions)
3. Wait 24-48 hours for DNS propagation

### Step 4: Add Backend Domain
For backend, use a subdomain:
- **Domain:** `api.lortrendengine.com` (or `api-prod.lortrendengine.com`)

**If using Railway:**
1. Railway Dashboard → Your Project → "Domain"
2. Add custom domain: `api.lortrendengine.com`
3. Railway gives DNS records
4. Add those records to your registrar

### Step 5: Update Environment Variables
Update in both Vercel and Railway:
- **Vercel:** `NEXT_PUBLIC_API_BASE_URL=https://api.lortrendengine.com`
- **Railway:** `CORS_ORIGIN=https://lortrendengine.com`

### Step 6: Test
- Visit `https://lortrendengine.com` ✓
- Test "Search Now" button ✓
- Check Settings to verify API connections ✓

---

## **PART 6: Environment Variables Summary**

### **Backend (.env file - DO NOT commit)**
```env
YOUTUBE_API_KEY=AIzaSy...
YOUTUBE_CHANNEL_ID=UCdL6_...
X_BEARER_TOKEN=AAAA...
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
MODEL_PROVIDER=mock
ANALYSIS_MODEL_PROVIDER=gpt
BRIEF_MODEL_PROVIDER=claude
CORS_ORIGIN=https://lortrendengine.com
```

### **Frontend (Vercel Dashboard)**
```
NEXT_PUBLIC_API_BASE_URL=https://api.lortrendengine.com
```

---

## **PART 7: Continuous Deployment**

### Auto-Deploy on Git Push
Both Vercel and Railway watch your GitHub repo:
1. Push to `main` branch
2. Vercel auto-deploys frontend (~2-3 min)
3. Railway auto-deploys backend (~5-10 min)
4. No manual deployment needed!

### Test the CI/CD
```bash
# Make a small change
echo "# Updated $(date)" >> README.md

# Push to GitHub
git add README.md
git commit -m "Test: Update README"
git push origin main

# Watch deployments:
# - Vercel: Dashboard → "Deployments"
# - Railway: Dashboard → "Deployments"
```

---

## **PART 8: Monitoring & Debugging**

### **Check Logs**

**Frontend (Vercel):**
- Dashboard → "Deployments" → Click deploy → "Logs"

**Backend (Railway):**
- Dashboard → "Logs" tab (real-time streaming)

### **Test API Health**
```bash
curl https://api.lortrendengine.com/api/health
# Should return: {"status":"ok"}
```

### **Test Full Search**
1. Visit frontend: `https://lortrendengine.com`
2. Click "Search Now" button
3. Watch Vercel & Railway logs
4. Verify results appear in "Today's Top Trends"

---

## **PART 9: Production Checklist**

- [ ] GitHub repo created and all code pushed
- [ ] Vercel frontend deployed with custom domain
- [ ] Railway/Render backend deployed with API subdomain
- [ ] All environment variables set in both platforms
- [ ] DNS records propagated (test with `nslookup`)
- [ ] Frontend connects to backend (test Search Now)
- [ ] API health check passes
- [ ] Keywords editing works on Settings page
- [ ] Trends update with custom keywords
- [ ] YouTube public video search returns results
- [ ] Auto-deployments working (push to GitHub → auto-deploy)

---

## **PART 10: Cost Breakdown**

| Service | Free Tier | Cost |
|---------|-----------|------|
| **GitHub** | Unlimited public repos | $0 |
| **Vercel** | 100GB bandwidth/month | $0-20/month |
| **Railway** | $5/month credits | $0-20/month typical |
| **Custom Domain** | N/A | $10-15/year |
| **API Keys** | Free tiers available | $0-50/month (optional) |

**Total typical cost: $15-50/year** (if using free API tiers)

---

## **Troubleshooting**

### **Vercel shows 404 on custom domain**
- DNS not propagated yet (wait 24-48 hours)
- Check: `nslookup lortrendengine.com`

### **Backend returns 500 error**
- Check Railway logs for Python errors
- Verify all env vars are set
- Restart Railway deployment

### **CORS errors in browser console**
- Update `CORS_ORIGIN` in Railway env vars
- Redeploy backend
- Wait 5 minutes

### **Search Now returns no results**
- Check API keys are valid
- Check `CORS_ORIGIN` allows frontend domain
- Review backend logs for API errors

---

## **Next Steps**

1. **Follow PART 1-5** step by step
2. **Test thoroughly** at each stage
3. **Monitor logs** after first deployment
4. **Set up GitHub alerts** for failed deployments
5. **Backup your `.env`** file (keep it safe, never commit)

---

**Questions?** Check the logs first - they usually tell you exactly what's wrong!

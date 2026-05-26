# StreamPulse AI — Deployment Guide

> Deploy the full stack for **₹0/month** using free tiers only.
> Total setup time: ~45 minutes.

---

## Architecture: What Deploys Where

```
React Dashboard  →  Vercel          (free forever)
Node.js Gateway  →  Render.com      (free tier, sleeps after 15min)
Drop Prediction  →  HuggingFace Spaces (free CPU)
Sentiment ML     →  HuggingFace Spaces (free CPU)
PostgreSQL       →  Railway.app     (free $5 credit/month)
Redis            →  Railway.app     (free $5 credit/month)
```

---

## Step 1 — Push to GitHub

First, get your code on GitHub so every platform can pull from it.

```bash
cd streampulse-ai
git init
git add .
git commit -m "feat: initial StreamPulse AI implementation"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/streampulse-ai.git
git push -u origin main
```

> Make sure `.env` is in `.gitignore` — it is by default in our setup.

---

## Step 2 — Railway (PostgreSQL + Redis)

Railway gives $5 free credit/month — enough for both databases.

### 2a. Create account
Go to **railway.app** → Sign up with GitHub.

### 2b. New project → Add PostgreSQL
1. Click **"New Project"** → **"Deploy from template"** → search **"PostgreSQL"**
2. Click Deploy
3. Once running, click the **PostgreSQL service** → **"Variables"** tab
4. Copy the `DATABASE_URL` — looks like:
   ```
   postgresql://postgres:password@roundhouse.proxy.rlwy.net:12345/railway
   ```

### 2c. Add Redis to same project
1. In same project, click **"+ New"** → **"Database"** → **"Add Redis"**
2. Once running, click Redis service → **"Variables"** tab
3. Copy the `REDIS_URL` — looks like:
   ```
   redis://default:password@roundhouse.proxy.rlwy.net:6379
   ```

### 2d. Run the database migration
Connect to your Railway PostgreSQL and run the init SQL:

```bash
# Install psql locally if needed: https://www.postgresql.org/download/
psql "YOUR_DATABASE_URL_FROM_RAILWAY" -f postgres/migrations/001_init.sql
```

Or use Railway's built-in query editor:
1. Click PostgreSQL service → **"Query"** tab
2. Paste contents of `postgres/migrations/001_init.sql`
3. Click Run

---

## Step 3 — HuggingFace Spaces (ML Services)

### 3a. Create account
Go to **huggingface.co** → Sign up (free).

### 3b. Deploy Drop Prediction Service

1. Go to **huggingface.co/new-space**
2. Fill in:
   - **Space name:** `streampulse-drop`
   - **SDK:** Docker
   - **Visibility:** Public
3. Click **"Create Space"**
4. In the Space, click **"Files"** tab → upload these files from `ml-drop-prediction/`:
   - `main.py`
   - `requirements.txt`
   - `Dockerfile`
   - `README.md`
5. HuggingFace builds automatically — takes ~3 minutes
6. Once running, your URL is:
   ```
   https://YOUR_USERNAME-streampulse-drop.hf.space
   ```
7. Test it:
   ```bash
   curl -X POST https://YOUR_USERNAME-streampulse-drop.hf.space/predict \
     -H "Content-Type: application/json" \
     -d '{"buffering_rate":0.2,"avg_bitrate_kbps":2000,"watch_percentage":0.6,"time_of_day_hour":20,"engagement_score":0.65}'
   ```

### 3c. Deploy Sentiment Service

1. Go to **huggingface.co/new-space**
2. Fill in:
   - **Space name:** `streampulse-sentiment`
   - **SDK:** Docker
   - **Visibility:** Public
3. Upload from `ml-sentiment/`:
   - `main.py`
   - `requirements.txt`
   - `Dockerfile`
   - `download_model.py`
   - `README.md`
4. **Important:** This build takes ~8 minutes (downloads PyTorch + DistilBERT ~260MB)
5. Once running, your URL is:
   ```
   https://YOUR_USERNAME-streampulse-sentiment.hf.space
   ```
6. Test it:
   ```bash
   curl -X POST https://YOUR_USERNAME-streampulse-sentiment.hf.space/analyze \
     -H "Content-Type: application/json" \
     -d '{"texts":["Amazing stream!","This is lagging","okay I guess"]}'
   ```

> **HuggingFace Spaces sleep after 48h of inactivity on free tier.**
> First request after sleep takes ~30s (cold start). For demo purposes this is fine.
> Pin the Space (costs nothing) to prevent sleeping.

---

## Step 4 — Render.com (Node.js Gateway)

### 4a. Create account
Go to **render.com** → Sign up with GitHub (free).

### 4b. New Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repo: `streampulse-ai`
3. Fill in settings:

| Setting | Value |
|---|---|
| **Name** | `streampulse-gateway` |
| **Region** | Singapore (closest to India) |
| **Branch** | `main` |
| **Root Directory** | `gateway` |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `node src/index.js` |
| **Instance Type** | Free |

### 4c. Add environment variables
In Render dashboard → **"Environment"** tab, add:

```
NODE_ENV=production
PORT=10000
REDIS_URL=<your Railway Redis URL>
DATABASE_URL=<your Railway PostgreSQL URL>
JWT_SECRET=<generate a long random string>
ML_DROP_URL=https://YOUR_USERNAME-streampulse-drop.hf.space
ML_SENTIMENT_URL=https://YOUR_USERNAME-streampulse-sentiment.hf.space
CORS_ORIGIN=https://streampulse-ai.vercel.app
```

> Generate JWT secret: run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` locally.

### 4d. Deploy
Click **"Create Web Service"** — Render builds and deploys automatically.
Your gateway URL will be:
```
https://streampulse-gateway.onrender.com
```

Test health:
```bash
curl https://streampulse-gateway.onrender.com/health
```

> **Render free tier sleeps after 15 minutes of inactivity.**
> First request after sleep takes ~30s. Use https://uptimerobot.com (free)
> to ping `/health` every 10 minutes and keep it awake during your demo.

---

## Step 5 — Vercel (React Dashboard)

### 5a. Create account
Go to **vercel.com** → Sign up with GitHub (free).

### 5b. Import project
1. Click **"Add New Project"**
2. Select your `streampulse-ai` GitHub repo
3. Configure:

| Setting | Value |
|---|---|
| **Framework Preset** | Vite |
| **Root Directory** | `dashboard` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

### 5c. Add environment variables
In Vercel project settings → **"Environment Variables"**:

```
VITE_GATEWAY_URL=https://streampulse-gateway.onrender.com
VITE_ML_DROP_URL=https://YOUR_USERNAME-streampulse-drop.hf.space
VITE_ML_SENTIMENT_URL=https://YOUR_USERNAME-streampulse-sentiment.hf.space
```

### 5d. Deploy
Click **"Deploy"** — Vercel builds in ~1 minute.
Your dashboard URL:
```
https://streampulse-ai.vercel.app
```

> Every `git push` to `main` auto-redeploys. No manual steps needed.

---

## Step 6 — Update CORS on Render

Now that you have your Vercel URL, go back to Render → Environment variables and update:
```
CORS_ORIGIN=https://streampulse-ai.vercel.app
```
Render auto-redeploys on env variable changes.

---

## Deployment Checklist

```
[ ] GitHub repo created and code pushed
[ ] Railway PostgreSQL running — DATABASE_URL copied
[ ] Railway Redis running — REDIS_URL copied
[ ] DB migration (001_init.sql) executed on Railway
[ ] HuggingFace Space: streampulse-drop — running + tested
[ ] HuggingFace Space: streampulse-sentiment — running + tested
[ ] Render gateway deployed — /health returns 200
[ ] Vercel dashboard deployed — loads at your URL
[ ] CORS_ORIGIN on Render updated to Vercel URL
[ ] UptimeRobot pinging Render /health every 10min
[ ] Mock Mode toggle works offline (no backend needed)
```

---

## All URLs (fill in after deployment)

| Service | URL |
|---|---|
| Dashboard | `https://streampulse-ai.vercel.app` |
| Gateway API | `https://streampulse-gateway.onrender.com` |
| Drop Prediction | `https://YOUR_USERNAME-streampulse-drop.hf.space/docs` |
| Sentiment | `https://YOUR_USERNAME-streampulse-sentiment.hf.space/docs` |
| Gateway Health | `https://streampulse-gateway.onrender.com/health` |
| Gateway Metrics | `https://streampulse-gateway.onrender.com/metrics` |

---

## Troubleshooting

### Dashboard loads but shows "Disconnected"
- Check Render gateway is awake (hit `/health` first)
- Check `VITE_GATEWAY_URL` in Vercel env vars — no trailing slash
- Check `CORS_ORIGIN` on Render matches your exact Vercel URL

### ML endpoints return 503
- HuggingFace Space is cold-starting — wait 30s and retry
- Check Space logs in HuggingFace dashboard for build errors

### Railway connection refused
- Check `DATABASE_URL` and `REDIS_URL` are exact copies from Railway
- Railway free credit may be exhausted — check billing tab

### Render deploy fails
- Check build logs — usually a missing `package-lock.json`
- Ensure Root Directory is set to `gateway` not root

---

## Cost Breakdown

| Service | Cost |
|---|---|
| Vercel (dashboard) | ₹0 — free forever |
| Render (gateway) | ₹0 — free tier |
| HuggingFace Spaces (×2) | ₹0 — free CPU tier |
| Railway (PostgreSQL + Redis) | ₹0 — within $5 free credit |
| **Total** | **₹0/month** |

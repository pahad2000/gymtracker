# Deploying GymTracker for Free

This guide walks you through deploying GymTracker using free services.

## Overview

| Component | Service | Free Tier Limits |
|-----------|---------|------------------|
| App Hosting | Vercel | Unlimited projects, 100GB bandwidth |
| Database | Neon | 0.5 GB storage, 1 project |
| AI Tips | Google Gemini | Free tier available |

**Total Cost: $0/month**

---

## Step 1: Set Up the Database (Neon)

### 1.1 Create Neon Account

1. Go to [neon.tech](https://neon.tech)
2. Click "Sign Up" (use GitHub for easiest setup)
3. Create a new project:
   - Name: `gymtracker`
   - Region: Choose closest to your users
   - PostgreSQL version: 16 (latest)

### 1.2 Get Connection String

1. In Neon dashboard, go to your project
2. Click "Connection Details"
3. Copy the connection string (looks like):
   ```
   postgresql://username:password@ep-xyz-123.us-east-1.aws.neon.tech/gymtracker?sslmode=require
   ```
4. Save this - you'll need it for Vercel

---

## Step 2: Prepare Your Code

### 2.1 Push to GitHub

If not already on GitHub:

```bash
# Initialize git (if needed)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/gymtracker.git
git branch -M main
git push -u origin main
```

### 2.2 Update Prisma for Serverless

Neon works best with connection pooling. Update your Prisma schema:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

No changes needed - our schema already supports this!

---

## Step 3: Deploy to Vercel

### 3.1 Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub (recommended)

### 3.2 Import Project

1. Click "Add New Project"
2. Select "Import Git Repository"
3. Choose your `gymtracker` repo
4. Click "Import"

### 3.3 Configure Environment Variables

Before deploying, add these environment variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon connection string |
| `AUTH_SECRET` | Generate with: `openssl rand -base64 32` |
| `GEMINI_API_KEY` | (Optional) Your Google Gemini API key |

To add them:
1. Expand "Environment Variables" section
2. Add each variable name and value
3. Make sure they apply to Production, Preview, and Development

### 3.4 Deploy

1. Click "Deploy"
2. Wait 1-2 minutes for build
3. Your app is live at `https://gymtracker-xxx.vercel.app`

---

## Step 4: Run Database Migration

After first deploy, you need to create the database tables.

### Option A: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Link to your project
vercel link

# Pull environment variables
vercel env pull .env.local

# Run migration
npx prisma migrate deploy
```

### Option B: Using Neon Console

1. Go to Neon dashboard → SQL Editor
2. Copy contents of `prisma/migrations/[timestamp]_init/migration.sql`
3. Paste and run in SQL Editor

---

## Step 5: Verify Deployment

1. Visit your Vercel URL
2. You should see the login page
3. Create an account
4. Try creating a workout

---

## About AI Tips in Production

The app uses **Google Gemini API** for AI-powered workout tips:
- Free tier available (15 requests per minute)
- Fast inference with Gemini 1.5 Flash
- Provides exercise form tips and advice

**To enable AI tips:**
1. Get a free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add `GEMINI_API_KEY` to your Vercel environment variables

**The app handles missing API keys gracefully:**
- If no API key is provided, fallback tips are shown
- No errors or crashes
- Common exercises have built-in tips

### Alternative AI Providers

If you prefer different providers:

1. **OpenAI API** (~$0.002 per tip)
   - Modify `src/lib/ai.ts` to use OpenAI instead

2. **Anthropic Claude** (pay-as-you-go)
   - Good for detailed form explanations

3. **Groq** (free tier)
   - Very fast inference with open models

---

## Custom Domain (Optional)

### Free Subdomain
Your app is already at: `gymtracker-xxx.vercel.app`

### Custom Domain
1. In Vercel dashboard → Settings → Domains
2. Add your domain (e.g., `gymtracker.com`)
3. Update DNS records as instructed

---

## Troubleshooting

### "Database connection failed"
- Check DATABASE_URL is correct in Vercel settings
- Make sure Neon project is active (not paused)
- Verify SSL mode: `?sslmode=require` at end of URL

### "Migration failed"
- Run `npx prisma migrate deploy` locally with production DATABASE_URL
- Or manually run SQL in Neon console

### "Auth not working"
- Verify AUTH_SECRET is set in Vercel
- Must be at least 32 characters
- Regenerate if needed: `openssl rand -base64 32`

### "Build failed"
- Check build logs in Vercel dashboard
- Common issues:
  - TypeScript errors (fix locally first)
  - Missing environment variables
  - Prisma client not generated

---

## Monitoring

### Vercel Dashboard
- View deployments, logs, and analytics
- Set up alerts for errors

### Neon Dashboard
- Monitor database size and queries
- View connection count

---

## Updating Your App

After making changes:

```bash
git add .
git commit -m "Your changes"
git push
```

Vercel automatically redeploys on every push to `main`.

---

## Cost Summary

| Service | Free Tier | Paid If Exceeded |
|---------|-----------|------------------|
| Vercel | 100GB bandwidth | $20/mo Pro |
| Neon | 0.5GB storage | $19/mo Pro |

For a personal workout tracker, you'll likely **never exceed free tiers**.

---

## Alternative Free Hosts

If Vercel doesn't work for you:

### Railway
- $5 free credit/month
- Includes PostgreSQL
- Deploy: `railway up`

### Render
- Free web services (spin down after 15min inactivity)
- Free PostgreSQL (90 days, then $7/mo)

### Fly.io
- Free tier for small apps
- Requires more configuration

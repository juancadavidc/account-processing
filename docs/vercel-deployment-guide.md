# Vercel Deployment Guide: Bancolombia Balances App

## Overview
This guide walks you through deploying the balances-app to Vercel with Supabase backend integration. The app is a Next.js 15 application with TypeScript, designed for real-time SMS webhook processing and banking transaction analytics.

## Prerequisites

### Required Accounts
- [ ] Vercel account (free or pro)
- [ ] Supabase account (free tier available)
- [ ] GitHub account (for repository hosting)

### Local Requirements
- [ ] Node.js 18+ installed
- [ ] npm or yarn package manager
- [ ] Git installed
- [ ] Vercel CLI (optional but recommended)

## Phase 1: Pre-Deployment Setup

### Step 1: Repository Preparation
```bash
# 1. Navigate to the balances-app directory
cd /Users/juancadavid/dev/opensource/bancolombia-balances/balances-app

# 2. Ensure all dependencies are installed
npm install

# 3. Test the build locally
npm run build

# 4. Test the application locally
npm run dev
```

### Step 2: Environment Variables Setup
Create a `.env.local` file in the balances-app directory:

```bash
# Client-side Supabase configuration (exposed to browser)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Server-side Supabase configuration (private)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Webhook authentication
WEBHOOK_SECRET=your_webhook_secret_token
```

### Step 3: Optional Vercel Configuration
Create `vercel.json` in the balances-app root (optional but recommended):

```json
{
  "functions": {
    "src/app/api/webhook/sms/route.ts": {
      "runtime": "edge",
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/webhook/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "POST, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Authorization, Content-Type"
        }
      ]
    }
  ]
}
```

## Phase 2: Supabase Setup

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create a new organization (if needed)
4. Create a new project:
   - Name: `bancolombia-balances`
   - Database password: Generate strong password
   - Region: Choose closest to your users
   - Pricing: Free tier is sufficient for development

### Step 2: Database Schema Setup
1. In Supabase dashboard, go to "SQL Editor"
2. Run the migration files from `migrations/` directory:

```sql
-- From 001_initial_schema.sql
-- Copy and paste the content from the migration file

-- From 002_fix_rls_policies.sql
-- Copy and paste the content from the migration file

-- From 003_enable_realtime.sql
-- Copy and paste the content from the migration file
```

### Step 3: Get Supabase Credentials
1. Go to Project Settings > API
2. Copy the following values:
   - Project URL (`NEXT_PUBLIC_SUPABASE_URL`)
   - Anon/Public key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - Service Role key (`SUPABASE_SERVICE_ROLE_KEY`)

### Step 4: Configure Real-time
1. Go to Database > Replication
2. Enable replication for the `transactions` table
3. Go to Database > Extensions
4. Ensure `realtime` extension is enabled

## Phase 3: Vercel Deployment

### Option A: Deploy via Vercel Dashboard (Recommended)

#### Step 1: Connect Repository
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your Git repository
4. Select the `balances-app` folder as the root directory

#### Step 2: Configure Build Settings
- **Framework Preset**: Next.js
- **Root Directory**: `balances-app`
- **Build Command**: `npm run build`
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install`
- **Development Command**: `npm run dev`

#### Step 3: Environment Variables
In the Vercel dashboard, add these environment variables:

| Key | Value | Type |
|-----|-------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Plain Text |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | Plain Text |
| `SUPABASE_URL` | Your Supabase project URL | Plain Text |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key | Secret |
| `WEBHOOK_SECRET` | Generate a secure token | Secret |

#### Step 4: Deploy
1. Click "Deploy"
2. Wait for build to complete (usually 2-3 minutes)
3. Note your deployment URL

### Option B: Deploy via CLI

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy from balances-app directory
cd balances-app
vercel

# 4. Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? bancolombia-balances-app
# - In which directory is your code located? ./

# 5. Deploy to production
vercel --prod
```

## Phase 4: Post-Deployment Configuration

### Step 1: Test Webhook Endpoint
Your webhook endpoint will be available at:
```
https://your-app.vercel.app/api/webhook/sms
```

Test it with curl:
```bash
curl -X POST https://your-app.vercel.app/api/webhook/sms \
  -H "Authorization: Bearer YOUR_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Bancolombia: Recibiste una transferencia por $190,000 de MARIA CUBAQUE en tu cuenta **7251, el 04/09/2025 a las 08:06",
    "timestamp": "2025-09-05T08:06:30Z",
    "phone": "+573001234567",
    "webhookId": "webhook_12345"
  }'
```

### Step 2: Configure Third-Party SMS Provider
Update your SMS provider (like Twilio, MessageBird, etc.) webhook URL to:
```
https://your-app.vercel.app/api/webhook/sms
```

Include the Authorization header:
```
Authorization: Bearer YOUR_WEBHOOK_SECRET
```

### Step 3: Monitor Deployment
1. Check Vercel Functions logs in dashboard
2. Monitor Supabase real-time subscriptions
3. Test the dashboard at your deployment URL

## Phase 5: Monitoring and Maintenance

### Health Checks
- [ ] Dashboard loads correctly
- [ ] Charts display mock/real data
- [ ] Webhook endpoint responds < 100ms
- [ ] Real-time updates working
- [ ] Mobile responsive design

### Performance Monitoring
1. Enable Vercel Analytics in dashboard
2. Monitor function execution times
3. Check Supabase connection pooling
4. Monitor real-time subscription performance

### Scaling Considerations
- Vercel Edge Functions auto-scale
- Supabase Free tier: 500MB database, 2GB bandwidth
- Consider upgrading for production workloads

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check dependencies
npm ci
npm run build

# Check TypeScript errors
npm run type-check
```

#### Environment Variables Not Working
1. Verify exact variable names in Vercel dashboard
2. Ensure `NEXT_PUBLIC_` prefix for client-side variables
3. Redeploy after changing environment variables

#### Webhook 404 Errors
1. Check API route file location: `src/app/api/webhook/sms/route.ts`
2. Verify App Router structure
3. Check Vercel function logs

#### Database Connection Issues
1. Verify Supabase credentials
2. Check RLS policies are enabled
3. Ensure service role key has proper permissions

#### Real-time Not Working
1. Enable realtime extension in Supabase
2. Configure table replication
3. Check client-side subscription code

### Support Resources
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Supabase Documentation](https://supabase.com/docs)
- Project Issues: Check `docs/qa/` for known issues

## Security Checklist

- [ ] Environment variables properly secured
- [ ] Webhook endpoint uses Bearer token authentication
- [ ] Supabase RLS policies enabled
- [ ] Service role key kept secret
- [ ] HTTPS enforced on all endpoints
- [ ] CORS headers properly configured

## Success Criteria

### Phase 1 (Frontend + Mocks)
- [ ] Dashboard loads in <2 seconds
- [ ] All components render correctly
- [ ] Mobile responsive design works
- [ ] Mock data displays properly

### Phase 2 (Backend Integration)
- [ ] Webhook responds in <100ms
- [ ] SMS parsing >99% accuracy
- [ ] Real-time updates within 1-2 seconds
- [ ] Zero data loss on webhook processing
- [ ] Error handling for malformed messages

---

*This deployment guide is part of the Bancolombia Balances App project. For technical details, see the PRD at `docs/prd.md` and architecture documentation at `docs/architecture.md`.*
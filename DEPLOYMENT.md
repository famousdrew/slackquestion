# Deployment Guide - Moving Off Local PC

This guide covers deploying Slack Question Router to production hosting.

---

## <� Quick Start (Railway - Recommended)

**Total Time:** 15-20 minutes
**Cost:** ~$10-20/month
**Difficulty:** Easy

### Prerequisites
- GitHub account
- Railway account (sign up at railway.app)
- Your Supabase database already set up (you have this)
- Slack tokens from `.env` file

### Step 1: Push Code to GitHub

```bash
# If you haven't initialized git remote yet:
cd F:/dev/slackfquestion

# Create a new repository on GitHub (via web interface)
# Then connect it:
git remote add origin https://github.com/YOUR_USERNAME/slackfquestion.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Railway

1. Go to https://railway.app
2. Click "Start a New Project"
3. Select "Deploy from GitHub repo"
4. Choose `slackfquestion` repository
5. Railway will auto-detect it's a Node.js app

### Step 3: Add Environment Variables

In Railway dashboard � Variables tab, add these:

```
SLACK_BOT_TOKEN=xoxb-your-token-here
SLACK_SIGNING_SECRET=your-secret-here
SLACK_APP_TOKEN=xapp-your-app-token
DATABASE_URL=your-supabase-connection-string
ESCALATION_USER_GROUP=t2
ESCALATION_CHANNEL=GN9LYD9T4
FIRST_ESCALATION_MINUTES=2
SECOND_ESCALATION_MINUTES=4
ACKNOWLEDGE_QUESTIONS=false
NODE_ENV=production
```

### Step 4: Configure Build & Start Commands

Railway auto-detects from `package.json`, but verify:

**Build Command:**
```bash
npm install && npx prisma generate && npm run build
```

**Start Command:**
```bash
npm run start
```

### Step 4.5: Run Database Migration (CRITICAL!)

**⚠️ IMPORTANT:** Before deploying, you MUST run a database migration or the app will crash!

The schema expects a `migrated_to_targets` column that may not exist in your database yet.

**Quick Fix (takes < 1 second):**

1. Go to your **Supabase Dashboard** → **SQL Editor**
2. Run this SQL:

```sql
ALTER TABLE workspace_config
ADD COLUMN IF NOT EXISTS migrated_to_targets BOOLEAN NOT NULL DEFAULT false;
```

3. Verify it worked (you should see: `migrated_to_targets | boolean | false`)

**Why this is needed:** The escalation engine checks this column at startup. Without it, you'll see errors like:
```
The column `workspace_config.migrated_to_targets` does not exist in the current database.
```

📖 **For more details, see [MIGRATIONS.md](./MIGRATIONS.md)**

### Step 5: Deploy!

Railway will automatically build and deploy. Watch the logs:
- Click on your service
- Go to "Deployments" tab
- Click latest deployment
- See live logs

**Expected output:**
```
� Slack Question Router is running in Socket Mode!
=� Question detection is active
=� Database connected
 Connected to Slack workspace: Your Workspace
=� Starting escalation engine...
```

### Step 6: Verify It's Working

1. Stop your local server (close the terminal)
2. Post a question in Slack
3. Check Railway logs to see it detected
4. Wait for escalations to fire

**Done!** Your bot is now running 24/7 in the cloud.

---

## =� Monitoring Your Deployment

### Railway Built-in Monitoring

Railway dashboard shows:
- **Deployment status**: Green = running, Red = crashed
- **Logs**: Real-time application output
- **Metrics**: CPU, RAM, network usage
- **Deployments history**: Every git push creates new deployment

### What to Monitor

**Healthy Signs:**
```
 "Connected to Slack workspace" every ~5 minutes (heartbeat)
 "Question detected" when users post questions
 "First escalation" and "Second escalation" firing
 No error stack traces
```

**Warning Signs:**
```
� "Connection error" repeatedly
� "Database error" messages
� Service keeps restarting
� High memory usage (>80% of allocated)
```

---

## =' Railway Configuration Files

### Add to package.json

Update your scripts to include a postinstall for Prisma:

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "postinstall": "prisma generate",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  }
}
```

### Create `.dockerignore` (optional but good practice)

```
node_modules
npm-debug.log
.env
.env.local
dist
*.log
.git
.gitignore
README.md
.DS_Store
```

---

## =� Cost Breakdown

### Railway Pricing

**Hobby Plan**: $5/month base credit
- Usage-based billing: $0.000231/GB-hour RAM
- Your app (~512 MB): ~$3.50/month
- Total: **$8-10/month**

**Pro Plan**: $20/month base credit (recommended for production)
- Same rates but more credits included
- Better support
- Total: **$20-30/month**

### Supabase (Database)

Already set up, you're paying:
- **Pro Plan**: $25/month
- Handles 500+ customers easily

### Total Monthly Cost

- **Development**: ~$35/month (Railway Hobby + Supabase Pro)
- **Production**: ~$55/month (Railway Pro + Supabase Pro)

---

## =� Alternative Option: Render.com

If you prefer Render over Railway:

### Render Setup

1. Go to https://render.com
2. Click "New +" � "Web Service"
3. Connect GitHub repository
4. Configure:
   - **Name**: slack-question-router
   - **Environment**: Node
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm run start`
   - **Plan**: Standard ($25/month for 2 GB RAM)

5. Add environment variables (same as Railway)

6. Click "Create Web Service"

**Render Pricing:**
- Starter ($7/month): 0.5 GB RAM - May be too small
- Standard ($25/month): 2 GB RAM - Recommended

---

## = Continuous Deployment

Once set up, deployments are automatic:

```bash
# Make code changes locally
git add .
git commit -m "Fix: improve question detection"
git push origin main

# Railway/Render automatically:
# 1. Detects new commit
# 2. Builds your app
# 3. Runs tests (if you add them)
# 4. Deploys new version
# 5. Switches traffic to new version
# 6. Total time: 2-3 minutes
```

---

## = Troubleshooting

### Bot Not Connecting

**Symptom**: "WebSocket connection failed"

**Solution**:
1. Check Railway logs for exact error
2. Verify `SLACK_APP_TOKEN` is correct (starts with `xapp-`)
3. Ensure Socket Mode is enabled in Slack app settings
4. Restart deployment: Railway dashboard � "Restart"

### Database Errors

**Symptom**: "Can't reach database server"

**Solution**:
1. Check `DATABASE_URL` is correct
2. Verify Supabase project is active (not paused)
3. Test connection from Railway:
   ```bash
   # In Railway shell
   npx prisma db pull
   ```
4. Check Supabase dashboard for connection limits

### Escalations Not Firing

**Symptom**: Questions detected but no escalations

**Solution**:
1. Check Railway logs for "Escalation engine started"
2. Verify times: `FIRST_ESCALATION_MINUTES` and `SECOND_ESCALATION_MINUTES`
3. Ensure questions are in monitored channels
4. Check answer detection mode settings

### Out of Memory

**Symptom**: Service keeps crashing, "Heap out of memory"

**Solution**:
1. Upgrade Railway plan (add more RAM)
2. Check for memory leaks in logs
3. Restart service to clear memory
4. Consider adding Redis for caching (reduces DB connections)

### Logs Not Showing

**Symptom**: No logs in Railway dashboard

**Solution**:
1. Add more logging to your code:
   ```typescript
   console.log('=� Bot starting...');
   console.log('=� Environment:', process.env.NODE_ENV);
   ```
2. Check "Deployments" � "Logs" tab (not "Observability")
3. Ensure `console.log` statements aren't being filtered

---

## =� Scaling Beyond Initial Deployment

### When You Reach 50-100 Customers

Current setup handles this fine. Monitor:
- RAM usage (should stay <70%)
- CPU usage (should stay <60%)
- Response times (should stay <1s)

**Action**: Nothing required yet

### When You Reach 200-500 Customers

**Upgrade Railway:**
- Increase RAM to 2 GB: ~$50/month
- Add Redis for job queue: +$10-30/month

**Deploy Changes:**
```bash
# Add Redis to project
npm install ioredis bullmq

# Railway will auto-provision Redis addon
# Or use Upstash Redis (serverless)
```

**Total Cost**: ~$100-150/month

### When You Reach 1000+ Customers

**Consider:**
1. **Multiple instances** (load balancing)
   - Railway: Deploy same service 3x times
   - Add load balancer
   - Cost: ~$150-300/month

2. **Migrate to AWS/GCP** (more control)
   - EC2/Compute Engine instances
   - Kubernetes for orchestration
   - Cost: ~$200-500/month

3. **Add monitoring**
   - DataDog ($30-100/month)
   - Sentry error tracking ($26/month)
   - Better uptime monitoring ($7/month)

---

## = Security Checklist

Before going to production:

- [ ] All secrets in environment variables (not hardcoded)
- [ ] `.env` file in `.gitignore` (never commit secrets)
- [ ] Railway/Render variables marked as "secret"
- [ ] Supabase RLS enabled (you already did this)
- [ ] Railway service set to "private" (not publicly accessible)
- [ ] Enable 2FA on Railway, GitHub, Supabase accounts
- [ ] Backup `.env` file somewhere safe (password manager)
- [ ] Document all environment variables in this file

---

## =� Pre-Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Railway/Render account created
- [ ] Database (Supabase) is running and accessible
- [ ] All environment variables documented
- [ ] `.gitignore` includes `.env`, `node_modules`, `dist`
- [ ] `package.json` has correct `start` script
- [ ] Prisma schema is up to date
- [ ] Slack app tokens are valid and working locally
- [ ] Test locally one more time before deploying

---

## <� Post-Deployment Checklist

- [ ] Service is running (Railway shows green status)
- [ ] Logs show "Connected to Slack workspace"
- [ ] Post test question in Slack � bot detects it
- [ ] Wait 2 min � first escalation fires
- [ ] Wait 2 more min � second escalation fires
- [ ] Mark question as answered � stops escalating
- [ ] `/qr-stats` command works
- [ ] Check Railway metrics (CPU, RAM reasonable)
- [ ] Set up uptime monitoring (Optional: UptimeRobot free)
- [ ] Add Railway deployment URL to README
- [ ] Celebrate! <�

---

## =� Pro Tips

1. **Use Railway's CLI for debugging**
   ```bash
   npm install -g @railway/cli
   railway login
   railway link
   railway logs
   railway shell  # SSH into your running service
   ```

2. **Set up deployment notifications**
   - Railway � Settings � Notifications
   - Get Slack/email alerts when deployments fail

3. **Create staging environment**
   - Duplicate Railway service
   - Point to separate Supabase database
   - Test changes before production

4. **Monitor costs**
   - Railway � Usage tab shows daily costs
   - Set up billing alerts at $50, $100
   - Review monthly to optimize

5. **Database backups**
   - Supabase does daily backups (7 days on Pro)
   - Export manually once/week for safety:
     ```bash
     pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
     ```

---

## = Useful Links

- **Railway Dashboard**: https://railway.app/dashboard
- **Railway Docs**: https://docs.railway.app
- **Supabase Dashboard**: https://app.supabase.com
- **Slack App Config**: https://api.slack.com/apps
- **Your GitHub Repo**: https://github.com/YOUR_USERNAME/slackfquestion

---

## S Need Help?

**Railway Support:**
- Community Discord: https://discord.gg/railway
- Docs: https://docs.railway.app
- Status: https://status.railway.app

**Render Support:**
- Community: https://community.render.com
- Docs: https://render.com/docs
- Status: https://status.render.com

**This Project:**
- GitHub Issues: Create issues for bugs
- Email: your-email@example.com

---

Last Updated: 2025-01-06

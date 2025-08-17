# Vercel Deployment Guide

## Quick Fix for Production Errors

Your SQLite database errors have been resolved with a **Vercel KV (Redis)** implementation that works in serverless environments.

## Required Environment Variables

Add these to your Vercel project settings:

```bash
# Required for Slack integration
SLACK_BOT_TOKEN=xoxb-your-token-here

# Required for AI sentiment analysis  
OPENAI_API_KEY=sk-proj-your-key-here

# Optional: Specific channel ID for demo data
CHANNEL_ID_HERE=C068SGKAC5P

# Vercel automatically provides these:
VERCEL=1
NODE_ENV=production
```

## Vercel KV Setup

1. **Enable Vercel KV** in your project:
   ```bash
   vercel kv create employee-engagement-db
   ```

2. **Link KV to your project**:
   ```bash
   vercel env pull
   ```

3. **KV environment variables** (added automatically):
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `KV_REST_API_READ_ONLY_TOKEN`

## Deployment Steps

1. **Install new dependencies**:
   ```bash
   npm install @vercel/kv
   ```

2. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

## What's Fixed

### ✅ Database Issues Resolved
- **SQLite → Vercel KV**: No more "SQLITE_CANTOPEN" errors
- **Serverless compatible**: Works in Vercel's serverless environment
- **Auto-fallback**: Graceful fallbacks if KV unavailable

### ✅ Timeout Issues Fixed  
- **Faster operations**: Redis is much faster than SQLite
- **No file I/O**: Eliminates filesystem bottlenecks
- **Optimized queries**: Simplified data operations

### ✅ Backwards Compatibility
- **Same interface**: All existing API routes work unchanged
- **Local development**: Still uses SQLite locally
- **Environment detection**: Automatically chooses correct database

## Database Architecture

```
Development (Local):  SQLite → sentiment.db
Production (Vercel):  Redis KV → @vercel/kv

Interface: Same for both (database.ts)
├── Local:  database.ts (SQLite implementation)
└── Production: database-kv.ts (Redis implementation)
```

## Expected Results

After deployment, your logs should show:
- ✅ No SQLite errors
- ✅ Faster API responses
- ✅ Successful sentiment analysis
- ✅ Dashboard loads correctly

## Alternative: Quick Mock Mode

If you prefer to skip KV setup and use mock data:

```bash
# Just deploy without KV - it will use fallback mock data
vercel --prod
```

The app includes comprehensive mock data that demonstrates all features without requiring a database.
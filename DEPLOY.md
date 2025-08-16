# Deploy to Vercel

## Prerequisites

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

## Environment Variables

Set these environment variables in Vercel:

1. Go to your Vercel project settings
2. Add these environment variables:

```
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
OPENAI_API_KEY=sk-your-openai-api-key
CHANNEL_ID_HERE=your-channel-id
```

## Deploy Commands

### Option 1: Deploy with Vercel CLI
```bash
# In the project root directory
vercel

# For production deployment
vercel --prod
```

### Option 2: Deploy via GitHub (Recommended)

1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Set environment variables in Vercel dashboard
4. Vercel will auto-deploy on git push

## Important Notes

⚠️ **Database Limitation**: SQLite doesn't persist in Vercel's serverless environment. The app will work with mock data for demonstration purposes.

For production use, consider:
- Vercel Postgres
- PlanetScale 
- Supabase
- MongoDB Atlas

## Vercel Configuration

The `vercel.json` file configures:
- Extended timeout for AI sentiment analysis (5 minutes)
- Proper serverless function handling
- Build optimizations

## Post-Deployment

After deployment:
1. Test the dashboard with mock data
2. Verify Slack API integration works
3. Test sentiment analysis functionality
4. Check all API endpoints respond correctly

Your app will be available at: `https://your-project-name.vercel.app`
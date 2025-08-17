# Slack Sentiment Dashboard

A Next.js application that analyzes team sentiment from Slack messages using AI.

## Project Overview
This application monitors team engagement by analyzing Slack message sentiment across channels, providing real-time insights and alerts for team managers.

## Tech Stack
- **Framework**: Next.js 14 with App Router & TypeScript
- **Styling**: Tailwind CSS  
- **Charts**: Recharts for data visualization
- **Database**: Vercel KV (Redis) for production, SQLite for local development
- **APIs**: Slack Web API, Vercel AI (OpenAI)
- **Icons**: Lucide React

## Features Implemented
✅ **Slack Integration**: Connect to workspace, fetch channels & messages
✅ **AI Sentiment Analysis**: Vercel AI with OpenAI for text sentiment scoring (1-10 scale)
✅ **Interactive Dashboard**: Real-time charts, channel comparison, trend analysis
✅ **Smart Alerts**: Red/yellow warnings for low sentiment channels
✅ **Setup Wizard**: 5-step guided setup process
✅ **Data Export**: CSV export functionality
✅ **Emoji Sentiment**: Basic emoji-to-sentiment mapping

## Environment Setup
Add to `.env.local`:
```
SLACK_BOT_TOKEN=xoxb-your-token
OPENAI_API_KEY=sk-your-key
CHANNEL_ID_HERE=your-channel-id
```

## API Routes
- `/api/slack/channels` - Get accessible Slack channels
- `/api/slack/messages` - Fetch messages from channels  
- `/api/sentiment/analyze` - AI sentiment analysis
- `/api/alerts` - Alert generation and management
- `/api/dashboard` - Dashboard data aggregation

## Database Schema
- **channels**: Channel info and settings
- **messages**: Message text, timestamps, sentiment scores
- **reactions**: Emoji reactions with sentiment values  
- **alerts**: Generated alerts for low sentiment

## Production Deployment
✅ **Vercel KV Integration**: Serverless-compatible Redis database
✅ **Environment Auto-Detection**: SQLite locally, KV in production
✅ **Fallback System**: Graceful mock data when databases unavailable
✅ **No SQLite Errors**: Resolved "SQLITE_CANTOPEN" production issues

## Usage
1. Add Slack bot to desired channels
2. Configure environment variables
3. Run setup wizard to connect and analyze
4. Monitor dashboard for sentiment trends
5. Respond to alerts for team engagement issues

## Development Commands
```bash
npm run dev    # Start development server
npm run build  # Build for production  
npm run lint   # Run ESLint
```

## Sentiment Scoring
- **Text Analysis**: AI rates 1-10 (1=very negative, 10=very positive)
- **Emoji Values**: 😀=9, 😢=2, 🔥=8, 😴=3, etc.
- **Combined Score**: 70% text + 30% emoji reactions
- **Alerts**: Red <4.0, Yellow 4.0-5.5, Green >5.5

## Demo Features
- Mock data for immediate visualization
- SQLite for easy local testing
- Step-by-step setup process
- Real-time sentiment trends
- Channel comparison analytics
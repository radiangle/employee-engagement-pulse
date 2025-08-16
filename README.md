# Team Engagement Analytics 📊

A comprehensive Next.js application that analyzes team sentiment from Slack messages using AI, providing real-time insights and executive-level reporting for team wellness monitoring.

## 🚀 Live Demo

**Deployed on Vercel:** https://employee-engagement-pulse-1dl4psyjh-quynhs-projects-2595b2a4.vercel.app

## ✨ Features

### 📋 Executive Dashboard
- **Executive Summary** - AI-generated paragraph with team health status and actionable recommendations
- **Real-time Sentiment Analysis** - OpenAI-powered text analysis with 1-10 scoring
- **Interactive Charts** - Sentiment trends, channel comparisons, and historical data
- **Smart Alerts** - Red/yellow warnings for channels needing attention

### 💬 Message Analysis  
- **Complete Message Insights** - Positive, negative, and high-engagement message examples
- **Word Cloud Visualization** - Top discussion topics and communication themes
- **Reaction Analysis** - Emoji sentiment mapping with 70+ workplace-specific emojis
- **Thread Support** - Analyzes both main messages and thread replies

### 🧠 AI-Powered Insights
- **Burnout Detection** - Identifies teams with 3+ consecutive low-sentiment days
- **Communication Patterns** - Average message length, engagement rates, interaction levels
- **Evidence-Based Recommendations** - Supporting data for each insight and recommendation
- **Trend Analysis** - Daily/weekly mood trends with percentage changes

### 📈 Team Wellness Monitoring
- **Channel Health Status** - Green/yellow/red indicators for each channel
- **Engagement Metrics** - Reaction rates, discussion activity, team interaction
- **Historical Tracking** - 7-day trend analysis with sentiment progression
- **Export Functionality** - CSV export for reporting and analysis

## 🛠️ Tech Stack

- **Framework:** Next.js 15.4.6 with App Router & TypeScript
- **Styling:** Tailwind CSS 4.0 with responsive design
- **Charts:** Recharts for interactive data visualization  
- **Database:** SQLite for local demo (production-ready for Postgres/MySQL)
- **APIs:** Slack Web API, OpenAI via Vercel AI SDK
- **Icons:** Lucide React for consistent iconography
- **Deployment:** Vercel with serverless functions

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- Slack workspace with bot token
- OpenAI API key

### Setup

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/employee-engagement-pulse.git
cd employee-engagement-pulse
```

2. **Install dependencies:**
```bash
npm install
```

3. **Environment setup:**
```bash
cp .env.example .env.local
```

Add your API keys to `.env.local`:
```env
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
OPENAI_API_KEY=sk-your-openai-api-key  
CHANNEL_ID_HERE=your-channel-id
```

4. **Run development server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## 🔧 Configuration

### Slack Bot Setup
1. Create a Slack app at https://api.slack.com/apps
2. Add these bot token scopes:
   - `channels:history` - Read message history
   - `channels:read` - List channels
   - `reactions:read` - Read message reactions
3. Install the app to your workspace
4. Copy the bot token to your `.env.local`

### OpenAI Setup
1. Get API key from https://platform.openai.com/api-keys
2. Add to `.env.local` as `OPENAI_API_KEY`

## 📊 Sentiment Analysis

### Text Analysis
- **AI Model:** OpenAI GPT for nuanced sentiment understanding
- **Scoring:** 1-10 scale (1=very negative, 10=very positive)
- **Context Awareness:** Considers workplace communication patterns

### Emoji Sentiment Mapping
- **70+ Workplace Emojis** mapped to sentiment values
- **Combined Scoring:** 70% text sentiment + 30% emoji reactions
- **Examples:** 😀=9.0, 🔥=8.0, 😅=4.0, 😢=2.0

### Burnout Detection
- **Pattern Recognition:** 3+ consecutive days below 4.0 sentiment
- **Early Warning System:** Identifies teams at risk before escalation
- **Actionable Alerts:** Specific recommendations for intervention

## 🏗️ Architecture

### Frontend
- **React Components:** Modular, reusable UI components
- **State Management:** React hooks for dashboard state
- **Responsive Design:** Mobile-first approach with desktop optimization

### Backend API Routes
- `/api/slack/channels` - Fetch accessible Slack channels
- `/api/slack/messages` - Retrieve messages with thread support
- `/api/sentiment/analyze` - AI sentiment analysis processing
- `/api/dashboard` - Aggregated dashboard data
- `/api/messages/evidence` - Detailed message analysis with insights

### Database Schema
```sql
-- Channels table
channels: id, name, is_active, alert_threshold

-- Messages table  
messages: id, channel_id, user_id, text, timestamp, sentiment_score

-- Reactions table
reactions: id, message_id, emoji, sentiment_value

-- Alerts table (for burnout/low sentiment warnings)
alerts: id, channel_id, alert_type, message, created_at
```

## 🚀 Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on git push

See [DEPLOY.md](DEPLOY.md) for detailed deployment instructions.

### Production Considerations
- **Database:** Replace SQLite with PostgreSQL/MySQL for production
- **Rate Limiting:** Slack API has 1 request/second limit (already implemented)
- **Caching:** Consider Redis for frequently accessed data
- **Monitoring:** Add error tracking (Sentry) and analytics

## 📱 Usage

### Dashboard Navigation
1. **Executive Summary** - Top-level team health overview
2. **Channel Cards** - Click to filter analysis by channel
3. **Charts Section** - Trend analysis and channel comparisons  
4. **Message Insights** - AI analysis with supporting evidence
5. **Word Cloud** - Visual representation of discussion topics
6. **Message Examples** - Actual positive/negative message samples

### Key Metrics
- **Sentiment Score:** 1-10 scale with color coding (red <4, yellow 4-7, green >7)
- **Engagement Rate:** Percentage of messages receiving reactions
- **Team Interaction:** Active vs passive communication patterns
- **Burnout Risk:** Early warning indicators based on sentiment patterns

## 🔍 Features Deep Dive

### Executive Summary
Generates dynamic AI summary including:
- Team health assessment
- Key metrics (total messages, sentiment distribution)
- Engagement analysis
- Identified concerns with evidence
- Actionable recommendations

### Message Analysis
- **Positive Messages:** Celebration, achievements, team wins
- **Needs Attention:** Stress indicators, frustration, burnout signals  
- **High Engagement:** Messages generating team discussion
- **Supporting Evidence:** Word frequency, reaction patterns, user behavior

### Smart Insights
- **Stress Detection:** Keywords like "deadline", "overwhelmed", "frustrated"
- **Positive Momentum:** "great", "awesome", "success", "achievement"
- **Engagement Patterns:** Response rates, discussion threads, collaboration indicators

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For questions or issues:
- Open an issue on GitHub
- Check [DEPLOY.md](DEPLOY.md) for deployment help
- Review API documentation in `/src/app/api/` files

---

**Built with ❤️ for better team communication and wellness monitoring.**
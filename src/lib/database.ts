import Database from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { tmpdir } from 'os';

// Use temp directory for SQLite in serverless environment
const dbPath = process.env.NODE_ENV === 'production' 
  ? path.join(tmpdir(), 'sentiment.db')
  : './sentiment.db';

let db: Database.Database;

try {
  db = new Database.Database(dbPath);
} catch (error) {
  console.warn('SQLite not available in serverless environment, using mock mode');
  // Create a mock database object for serverless environments
  db = {
    run: (sql: string, params: any, callback: any) => {
      if (callback) callback(null);
      return { lastID: 1 } as any;
    },
    get: (sql: string, params: any, callback: any) => {
      if (callback) callback(null, {});
      return {} as any;
    },
    all: (sql: string, params: any, callback: any) => {
      if (callback) callback(null, []);
      return [] as any;
    },
    close: (callback?: any) => {
      if (callback) callback();
    }
  } as any;
}

// Promisify database methods
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

export interface Channel {
  id: string;
  name: string;
  is_active: boolean;
  alert_threshold: number;
}

export interface Message {
  id: number;
  channel_id: string;
  user_id: string;
  text: string;
  timestamp: string;
  sentiment_score: number;
  created_at: string;
}

export interface Reaction {
  id: number;
  message_id: number;
  emoji: string;
  sentiment_value: number;
}

export interface Alert {
  id: number;
  channel_id: string;
  alert_type: string;
  message: string;
  created_at: string;
  is_resolved: boolean;
}

// Initialize database tables
export async function initializeDatabase() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      name TEXT,
      is_active BOOLEAN DEFAULT 1,
      alert_threshold REAL DEFAULT 4.0
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id TEXT,
      user_id TEXT,
      text TEXT,
      timestamp TEXT,
      sentiment_score REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER,
      emoji TEXT,
      sentiment_value REAL,
      FOREIGN KEY (message_id) REFERENCES messages (id)
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id TEXT,
      alert_type TEXT,
      message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      is_resolved BOOLEAN DEFAULT 0
    )
  `);
}

// Channel operations
export async function getChannels(): Promise<Channel[]> {
  return (await dbAll('SELECT * FROM channels ORDER BY name')) as Channel[];
}

export async function saveChannel(channel: Omit<Channel, 'alert_threshold' | 'is_active'>) {
  await dbRun(
    'INSERT OR REPLACE INTO channels (id, name) VALUES (?, ?)',
    [channel.id, channel.name]
  );
}

// Message operations
export async function getMessages(channelId?: string, limit = 100): Promise<Message[]> {
  const query = channelId 
    ? 'SELECT * FROM messages WHERE channel_id = ? ORDER BY timestamp DESC LIMIT ?'
    : 'SELECT * FROM messages ORDER BY timestamp DESC LIMIT ?';
  
  const params = channelId ? [channelId, limit] : [limit];
  return (await dbAll(query, params)) as Message[];
}

export async function saveMessage(message: Omit<Message, 'id' | 'created_at'>) {
  const result: any = await dbRun(
    'INSERT INTO messages (channel_id, user_id, text, timestamp, sentiment_score) VALUES (?, ?, ?, ?, ?)',
    [message.channel_id, message.user_id, message.text, message.timestamp, message.sentiment_score]
  );
  
  // For SQLite, we need to get the last inserted row ID differently
  const lastIdResult: any = await dbGet('SELECT last_insert_rowid() as id');
  return { lastID: lastIdResult.id, ...result };
}

// Reaction operations
export async function saveReaction(reaction: Omit<Reaction, 'id'>) {
  await dbRun(
    'INSERT INTO reactions (message_id, emoji, sentiment_value) VALUES (?, ?, ?)',
    [reaction.message_id, reaction.emoji, reaction.sentiment_value]
  );
}

// Alert operations
export async function getAlerts(channelId?: string): Promise<Alert[]> {
  const query = channelId 
    ? 'SELECT * FROM alerts WHERE channel_id = ? AND is_resolved = 0 ORDER BY created_at DESC'
    : 'SELECT * FROM alerts WHERE is_resolved = 0 ORDER BY created_at DESC';
  
  const params = channelId ? [channelId] : [];
  return (await dbAll(query, params)) as Alert[];
}

export async function saveAlert(alert: Omit<Alert, 'id' | 'created_at' | 'is_resolved'>) {
  await dbRun(
    'INSERT INTO alerts (channel_id, alert_type, message) VALUES (?, ?, ?)',
    [alert.channel_id, alert.alert_type, alert.message]
  );
}

// Analytics queries
export async function getChannelSentimentTrend(channelId: string, days = 7) {
  return await dbAll(`
    SELECT 
      DATE(timestamp) as date,
      AVG(sentiment_score) as avg_sentiment,
      COUNT(*) as message_count,
      COUNT(DISTINCT user_id) as active_users,
      MIN(sentiment_score) as min_sentiment,
      MAX(sentiment_score) as max_sentiment,
      ROUND(
        (COUNT(CASE WHEN sentiment_score < 4 THEN 1 END) * 100.0) / COUNT(*), 2
      ) as negative_percentage
    FROM messages 
    WHERE channel_id = ? 
    AND timestamp >= datetime('now', '-${days} days')
    GROUP BY DATE(timestamp)
    ORDER BY date
  `, [channelId]);
}

// Get daily mood aggregation across all channels
export async function getDailyMoodTrends(days = 14) {
  return await dbAll(`
    SELECT 
      DATE(timestamp) as date,
      AVG(sentiment_score) as overall_mood,
      COUNT(*) as total_messages,
      COUNT(DISTINCT channel_id) as active_channels,
      COUNT(DISTINCT user_id) as active_users,
      -- Calculate mood categories
      ROUND(
        (COUNT(CASE WHEN sentiment_score >= 7 THEN 1 END) * 100.0) / COUNT(*), 1
      ) as positive_percentage,
      ROUND(
        (COUNT(CASE WHEN sentiment_score < 4 THEN 1 END) * 100.0) / COUNT(*), 1
      ) as negative_percentage,
      ROUND(
        (COUNT(CASE WHEN sentiment_score >= 4 AND sentiment_score < 7 THEN 1 END) * 100.0) / COUNT(*), 1
      ) as neutral_percentage
    FROM messages 
    WHERE timestamp >= datetime('now', '-${days} days')
    GROUP BY DATE(timestamp)
    ORDER BY date
  `);
}

// Get weekly mood aggregation
export async function getWeeklyMoodTrends(weeks = 4) {
  return await dbAll(`
    SELECT 
      strftime('%Y-%W', timestamp) as week,
      DATE(timestamp, 'weekday 0', '-6 days') as week_start,
      AVG(sentiment_score) as weekly_mood,
      COUNT(*) as total_messages,
      COUNT(DISTINCT user_id) as unique_contributors,
      -- Trend indicators
      ROUND(AVG(sentiment_score), 2) as avg_sentiment,
      ROUND(
        (COUNT(CASE WHEN sentiment_score < 4 THEN 1 END) * 100.0) / COUNT(*), 1
      ) as burnout_risk_percentage
    FROM messages 
    WHERE timestamp >= datetime('now', '-${weeks * 7} days')
    GROUP BY strftime('%Y-%W', timestamp)
    ORDER BY week_start
  `);
}

export async function getChannelSummary() {
  return await dbAll(`
    SELECT 
      c.id,
      c.name,
      AVG(m.sentiment_score) as avg_sentiment,
      COUNT(m.id) as total_messages,
      MAX(m.timestamp) as last_message,
      COUNT(DISTINCT m.user_id) as active_users,
      ROUND(
        (COUNT(CASE WHEN m.sentiment_score < 4 THEN 1 END) * 100.0) / COUNT(m.id), 1
      ) as burnout_risk_percentage
    FROM channels c
    LEFT JOIN messages m ON c.id = m.channel_id
    WHERE m.timestamp >= datetime('now', '-7 days')
    GROUP BY c.id, c.name
    ORDER BY avg_sentiment ASC
  `);
}

// Detect burnout patterns
export async function detectBurnoutRisks() {
  // Get channels with 3+ consecutive days below 4.0
  const consecutiveLowDays = await dbAll(`
    WITH daily_sentiment AS (
      SELECT 
        channel_id,
        DATE(timestamp) as date,
        AVG(sentiment_score) as daily_sentiment
      FROM messages 
      WHERE timestamp >= datetime('now', '-7 days')
      GROUP BY channel_id, DATE(timestamp)
    ),
    low_sentiment_days AS (
      SELECT 
        channel_id,
        date,
        daily_sentiment,
        ROW_NUMBER() OVER (PARTITION BY channel_id ORDER BY date) - 
        ROW_NUMBER() OVER (PARTITION BY channel_id, CASE WHEN daily_sentiment < 4.0 THEN 1 ELSE 0 END ORDER BY date) as grp
      FROM daily_sentiment
      WHERE daily_sentiment < 4.0
    )
    SELECT 
      channel_id,
      MIN(date) as streak_start,
      MAX(date) as streak_end,
      COUNT(*) as consecutive_days,
      AVG(daily_sentiment) as avg_sentiment_in_streak
    FROM low_sentiment_days
    GROUP BY channel_id, grp
    HAVING COUNT(*) >= 3
  `);

  // Get declining trend channels (5+ day decline)
  const decliningTrends = await dbAll(`
    WITH daily_sentiment AS (
      SELECT 
        channel_id,
        DATE(timestamp) as date,
        AVG(sentiment_score) as daily_sentiment,
        ROW_NUMBER() OVER (PARTITION BY channel_id ORDER BY DATE(timestamp)) as day_num
      FROM messages 
      WHERE timestamp >= datetime('now', '-5 days')
      GROUP BY channel_id, DATE(timestamp)
      HAVING COUNT(*) >= 3
    ),
    trend_analysis AS (
      SELECT 
        channel_id,
        COUNT(*) as days_count,
        -- Calculate trend slope (simple linear regression)
        (COUNT(*) * SUM(day_num * daily_sentiment) - SUM(day_num) * SUM(daily_sentiment)) / 
        (COUNT(*) * SUM(day_num * day_num) - SUM(day_num) * SUM(day_num)) as trend_slope,
        AVG(daily_sentiment) as avg_sentiment,
        MIN(daily_sentiment) as min_sentiment,
        MAX(daily_sentiment) as max_sentiment
      FROM daily_sentiment
      GROUP BY channel_id
    )
    SELECT *
    FROM trend_analysis
    WHERE days_count >= 3 
    AND trend_slope < -0.3  -- Significant negative trend
    AND avg_sentiment < 6.0  -- Overall concerning sentiment
  `);

  // Get user-level burnout risks
  const userBurnoutRisks = await dbAll(`
    SELECT 
      user_id,
      COUNT(DISTINCT channel_id) as channels_active,
      COUNT(*) as total_messages,
      AVG(sentiment_score) as avg_sentiment,
      MIN(sentiment_score) as lowest_sentiment,
      ROUND(
        (COUNT(CASE WHEN sentiment_score < 4 THEN 1 END) * 100.0) / COUNT(*), 1
      ) as negative_message_percentage,
      MAX(timestamp) as last_activity
    FROM messages 
    WHERE timestamp >= datetime('now', '-7 days')
    GROUP BY user_id
    HAVING avg_sentiment < 4.5 
    AND negative_message_percentage > 30
    ORDER BY avg_sentiment ASC
  `);

  return {
    consecutive_low_channels: consecutiveLowDays,
    declining_trend_channels: decliningTrends,
    at_risk_users: userBurnoutRisks,
  };
}

// Initialize database on import
initializeDatabase().catch(console.error);
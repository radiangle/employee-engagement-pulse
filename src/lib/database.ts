// Import the appropriate database adapter based on environment
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';

// Use KV for production/Vercel, SQLite for local development
let dbModule: any;

if (isProduction || isVercel) {
  // Use Vercel KV for serverless environments
  try {
    dbModule = require('./database-kv');
  } catch (error) {
    console.warn('Vercel KV not available, falling back to mock database');
    // Fallback mock for when KV is not available
    dbModule = {
      initializeDatabase: async () => {},
      getChannels: async () => [],
      saveChannel: async () => {},
      getMessages: async () => [],
      saveMessage: async () => ({ lastID: Date.now() }),
      saveReaction: async () => {},
      getAlerts: async () => [],
      saveAlert: async () => {},
      getChannelSentimentTrend: async () => [],
      getDailyMoodTrends: async () => [],
      getWeeklyMoodTrends: async () => [],
      getChannelSummary: async () => [],
      detectBurnoutRisks: async () => ({
        consecutive_low_channels: [],
        declining_trend_channels: [],
        at_risk_users: [],
      }),
    };
  }
} else {
  // Use SQLite for local development
  try {
    const Database = require('sqlite3');
    const { promisify } = require('util');
    
    const dbPath = './sentiment.db';
    let db: any;
    
    try {
      db = new Database.Database(dbPath);
    } catch (error) {
      console.warn('SQLite not available, using mock mode');
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
    
    const dbRun = promisify(db.run.bind(db));
    const dbGet = promisify(db.get.bind(db));
    const dbAll = promisify(db.all.bind(db));
    
    // SQLite implementation
    dbModule = {
      initializeDatabase: async function() {
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
      },
      
      getChannels: async function() {
        return (await dbAll('SELECT * FROM channels ORDER BY name'));
      },

      saveChannel: async function(channel: any) {
        await dbRun(
          'INSERT OR REPLACE INTO channels (id, name) VALUES (?, ?)',
          [channel.id, channel.name]
        );
      },

      getMessages: async function(channelId?: string, limit = 100) {
        const query = channelId 
          ? 'SELECT * FROM messages WHERE channel_id = ? ORDER BY timestamp DESC LIMIT ?'
          : 'SELECT * FROM messages ORDER BY timestamp DESC LIMIT ?';
        
        const params = channelId ? [channelId, limit] : [limit];
        return (await dbAll(query, params));
      },

      saveMessage: async function(message: any) {
        const result: any = await dbRun(
          'INSERT INTO messages (channel_id, user_id, text, timestamp, sentiment_score) VALUES (?, ?, ?, ?, ?)',
          [message.channel_id, message.user_id, message.text, message.timestamp, message.sentiment_score]
        );
        
        const lastIdResult: any = await dbGet('SELECT last_insert_rowid() as id');
        return { lastID: lastIdResult.id, ...result };
      },

      saveReaction: async function(reaction: any) {
        await dbRun(
          'INSERT INTO reactions (message_id, emoji, sentiment_value) VALUES (?, ?, ?)',
          [reaction.message_id, reaction.emoji, reaction.sentiment_value]
        );
      },

      getAlerts: async function(channelId?: string) {
        const query = channelId 
          ? 'SELECT * FROM alerts WHERE channel_id = ? AND is_resolved = 0 ORDER BY created_at DESC'
          : 'SELECT * FROM alerts WHERE is_resolved = 0 ORDER BY created_at DESC';
        
        const params = channelId ? [channelId] : [];
        return (await dbAll(query, params));
      },

      saveAlert: async function(alert: any) {
        await dbRun(
          'INSERT INTO alerts (channel_id, alert_type, message) VALUES (?, ?, ?)',
          [alert.channel_id, alert.alert_type, alert.message]
        );
      },

      getChannelSentimentTrend: async function(channelId: string, days = 7) {
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
      },

      getDailyMoodTrends: async function(days = 14) {
        return await dbAll(`
          SELECT 
            DATE(timestamp) as date,
            AVG(sentiment_score) as overall_mood,
            COUNT(*) as total_messages,
            COUNT(DISTINCT channel_id) as active_channels,
            COUNT(DISTINCT user_id) as active_users,
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
      },

      getWeeklyMoodTrends: async function(weeks = 4) {
        return await dbAll(`
          SELECT 
            strftime('%Y-%W', timestamp) as week,
            DATE(timestamp, 'weekday 0', '-6 days') as week_start,
            AVG(sentiment_score) as weekly_mood,
            COUNT(*) as total_messages,
            COUNT(DISTINCT user_id) as unique_contributors,
            ROUND(AVG(sentiment_score), 2) as avg_sentiment,
            ROUND(
              (COUNT(CASE WHEN sentiment_score < 4 THEN 1 END) * 100.0) / COUNT(*), 1
            ) as burnout_risk_percentage
          FROM messages 
          WHERE timestamp >= datetime('now', '-${weeks * 7} days')
          GROUP BY strftime('%Y-%W', timestamp)
          ORDER BY week_start
        `);
      },

      getChannelSummary: async function() {
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
      },

      detectBurnoutRisks: async function() {
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
          AND trend_slope < -0.3
          AND avg_sentiment < 6.0
        `);

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
    };
  } catch (error) {
    console.warn('SQLite failed to initialize, using mock database');
    dbModule = {
      initializeDatabase: async () => {},
      getChannels: async () => [],
      saveChannel: async () => {},
      getMessages: async () => [],
      saveMessage: async () => ({ lastID: Date.now() }),
      saveReaction: async () => {},
      getAlerts: async () => [],
      saveAlert: async () => {},
      getChannelSentimentTrend: async () => [],
      getDailyMoodTrends: async () => [],
      getWeeklyMoodTrends: async () => [],
      getChannelSummary: async () => [],
      detectBurnoutRisks: async () => ({
        consecutive_low_channels: [],
        declining_trend_channels: [],
        at_risk_users: [],
      }),
    };
  }
}

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

// Export all functions from the chosen database module
export const initializeDatabase = dbModule.initializeDatabase;
export const getChannels = dbModule.getChannels;
export const saveChannel = dbModule.saveChannel;
export const getMessages = dbModule.getMessages;
export const saveMessage = dbModule.saveMessage;
export const saveReaction = dbModule.saveReaction;
export const getAlerts = dbModule.getAlerts;
export const saveAlert = dbModule.saveAlert;
export const getChannelSentimentTrend = dbModule.getChannelSentimentTrend;
export const getDailyMoodTrends = dbModule.getDailyMoodTrends;
export const getWeeklyMoodTrends = dbModule.getWeeklyMoodTrends;
export const getChannelSummary = dbModule.getChannelSummary;
export const detectBurnoutRisks = dbModule.detectBurnoutRisks;

// Initialize database on import
initializeDatabase().catch(console.error);
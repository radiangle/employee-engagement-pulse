import { kv } from '@vercel/kv';

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

// Helper function to generate unique IDs
function generateId(): number {
  return Date.now() + Math.floor(Math.random() * 1000);
}

// Initialize database (no-op for KV, but kept for compatibility)
export async function initializeDatabase() {
  // KV doesn't need initialization, but we can set up some default data structure
  try {
    const exists = await kv.exists('channels_initialized');
    if (!exists) {
      await kv.set('channels_initialized', true);
      await kv.set('channels', []);
      await kv.set('message_counter', 0);
      await kv.set('alert_counter', 0);
    }
  } catch (error) {
    console.warn('KV initialization skipped (likely in development):', error);
  }
}

// Channel operations
export async function getChannels(): Promise<Channel[]> {
  try {
    const channels = await kv.get<Channel[]>('channels');
    return channels || [];
  } catch (error) {
    console.warn('Failed to get channels from KV, returning empty array:', error);
    return [];
  }
}

export async function saveChannel(channel: Omit<Channel, 'alert_threshold' | 'is_active'>) {
  try {
    const channels = await getChannels();
    const existingIndex = channels.findIndex(c => c.id === channel.id);
    
    const newChannel: Channel = {
      ...channel,
      is_active: true,
      alert_threshold: 4.0,
    };
    
    if (existingIndex >= 0) {
      channels[existingIndex] = { ...channels[existingIndex], ...newChannel };
    } else {
      channels.push(newChannel);
    }
    
    await kv.set('channels', channels);
  } catch (error) {
    console.warn('Failed to save channel to KV:', error);
  }
}

// Message operations
export async function getMessages(channelId?: string, limit = 100): Promise<Message[]> {
  try {
    const key = channelId ? `messages:${channelId}` : 'messages:all';
    const messages = await kv.get<Message[]>(key) || [];
    
    // If no specific channel messages, get from all channels
    if (!channelId) {
      const channels = await getChannels();
      const allMessages: Message[] = [];
      
      for (const channel of channels) {
        const channelMessages = await kv.get<Message[]>(`messages:${channel.id}`) || [];
        allMessages.push(...channelMessages);
      }
      
      return allMessages
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    }
    
    return messages
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  } catch (error) {
    console.warn('Failed to get messages from KV:', error);
    return [];
  }
}

export async function saveMessage(message: Omit<Message, 'id' | 'created_at'>) {
  try {
    const id = generateId();
    const newMessage: Message = {
      ...message,
      id,
      created_at: new Date().toISOString(),
    };
    
    // Save to channel-specific key
    const channelMessages = await kv.get<Message[]>(`messages:${message.channel_id}`) || [];
    channelMessages.push(newMessage);
    await kv.set(`messages:${message.channel_id}`, channelMessages);
    
    return { lastID: id };
  } catch (error) {
    console.warn('Failed to save message to KV:', error);
    return { lastID: generateId() };
  }
}

// Reaction operations
export async function saveReaction(reaction: Omit<Reaction, 'id'>) {
  try {
    const id = generateId();
    const newReaction: Reaction = { ...reaction, id };
    
    const reactions = await kv.get<Reaction[]>('reactions') || [];
    reactions.push(newReaction);
    await kv.set('reactions', reactions);
  } catch (error) {
    console.warn('Failed to save reaction to KV:', error);
  }
}

// Alert operations
export async function getAlerts(channelId?: string): Promise<Alert[]> {
  try {
    const alerts = await kv.get<Alert[]>('alerts') || [];
    
    if (channelId) {
      return alerts.filter(alert => alert.channel_id === channelId && !alert.is_resolved);
    }
    
    return alerts.filter(alert => !alert.is_resolved);
  } catch (error) {
    console.warn('Failed to get alerts from KV:', error);
    return [];
  }
}

export async function saveAlert(alert: Omit<Alert, 'id' | 'created_at' | 'is_resolved'>) {
  try {
    const id = generateId();
    const newAlert: Alert = {
      ...alert,
      id,
      created_at: new Date().toISOString(),
      is_resolved: false,
    };
    
    const alerts = await kv.get<Alert[]>('alerts') || [];
    alerts.push(newAlert);
    await kv.set('alerts', alerts);
  } catch (error) {
    console.warn('Failed to save alert to KV:', error);
  }
}

// Analytics queries (simplified for KV)
export async function getChannelSentimentTrend(channelId: string, days = 7) {
  try {
    const messages = await kv.get<Message[]>(`messages:${channelId}`) || [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentMessages = messages.filter(m => new Date(m.timestamp) >= cutoffDate);
    
    // Group by date
    const dailyGroups: { [date: string]: Message[] } = {};
    recentMessages.forEach(msg => {
      const date = new Date(msg.timestamp).toISOString().split('T')[0];
      if (!dailyGroups[date]) dailyGroups[date] = [];
      dailyGroups[date].push(msg);
    });
    
    return Object.entries(dailyGroups).map(([date, msgs]) => ({
      date,
      avg_sentiment: msgs.reduce((sum, m) => sum + m.sentiment_score, 0) / msgs.length,
      message_count: msgs.length,
      active_users: new Set(msgs.map(m => m.user_id)).size,
      min_sentiment: Math.min(...msgs.map(m => m.sentiment_score)),
      max_sentiment: Math.max(...msgs.map(m => m.sentiment_score)),
      negative_percentage: (msgs.filter(m => m.sentiment_score < 4).length / msgs.length) * 100,
    })).sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.warn('Failed to get channel sentiment trend:', error);
    return [];
  }
}

export async function getDailyMoodTrends(days = 14) {
  try {
    const channels = await getChannels();
    const allMessages: Message[] = [];
    
    for (const channel of channels) {
      const messages = await kv.get<Message[]>(`messages:${channel.id}`) || [];
      allMessages.push(...messages);
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentMessages = allMessages.filter(m => new Date(m.timestamp) >= cutoffDate);
    
    // Group by date
    const dailyGroups: { [date: string]: Message[] } = {};
    recentMessages.forEach(msg => {
      const date = new Date(msg.timestamp).toISOString().split('T')[0];
      if (!dailyGroups[date]) dailyGroups[date] = [];
      dailyGroups[date].push(msg);
    });
    
    return Object.entries(dailyGroups).map(([date, msgs]) => ({
      date,
      overall_mood: msgs.reduce((sum, m) => sum + m.sentiment_score, 0) / msgs.length,
      total_messages: msgs.length,
      active_channels: new Set(msgs.map(m => m.channel_id)).size,
      active_users: new Set(msgs.map(m => m.user_id)).size,
      positive_percentage: (msgs.filter(m => m.sentiment_score >= 7).length / msgs.length) * 100,
      negative_percentage: (msgs.filter(m => m.sentiment_score < 4).length / msgs.length) * 100,
      neutral_percentage: (msgs.filter(m => m.sentiment_score >= 4 && m.sentiment_score < 7).length / msgs.length) * 100,
    })).sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.warn('Failed to get daily mood trends:', error);
    return [];
  }
}

export async function getWeeklyMoodTrends(weeks = 4) {
  try {
    const channels = await getChannels();
    const allMessages: Message[] = [];
    
    for (const channel of channels) {
      const messages = await kv.get<Message[]>(`messages:${channel.id}`) || [];
      allMessages.push(...messages);
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (weeks * 7));
    
    const recentMessages = allMessages.filter(m => new Date(m.timestamp) >= cutoffDate);
    
    // Group by week (simplified)
    const weeklyGroups: { [week: string]: Message[] } = {};
    recentMessages.forEach(msg => {
      const date = new Date(msg.timestamp);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyGroups[weekKey]) weeklyGroups[weekKey] = [];
      weeklyGroups[weekKey].push(msg);
    });
    
    return Object.entries(weeklyGroups).map(([week_start, msgs]) => ({
      week: week_start,
      week_start,
      weekly_mood: msgs.reduce((sum, m) => sum + m.sentiment_score, 0) / msgs.length,
      total_messages: msgs.length,
      unique_contributors: new Set(msgs.map(m => m.user_id)).size,
      avg_sentiment: msgs.reduce((sum, m) => sum + m.sentiment_score, 0) / msgs.length,
      burnout_risk_percentage: (msgs.filter(m => m.sentiment_score < 4).length / msgs.length) * 100,
    })).sort((a, b) => a.week_start.localeCompare(b.week_start));
  } catch (error) {
    console.warn('Failed to get weekly mood trends:', error);
    return [];
  }
}

export async function getChannelSummary() {
  try {
    const channels = await getChannels();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    
    const summaries = [];
    
    for (const channel of channels) {
      const messages = await kv.get<Message[]>(`messages:${channel.id}`) || [];
      const recentMessages = messages.filter(m => new Date(m.timestamp) >= cutoffDate);
      
      if (recentMessages.length > 0) {
        const avgSentiment = recentMessages.reduce((sum, m) => sum + m.sentiment_score, 0) / recentMessages.length;
        const lastMessage = recentMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
        
        summaries.push({
          id: channel.id,
          name: channel.name,
          avg_sentiment: avgSentiment,
          total_messages: recentMessages.length,
          last_message: lastMessage.timestamp,
          active_users: new Set(recentMessages.map(m => m.user_id)).size,
          burnout_risk_percentage: (recentMessages.filter(m => m.sentiment_score < 4).length / recentMessages.length) * 100,
        });
      }
    }
    
    return summaries.sort((a, b) => a.avg_sentiment - b.avg_sentiment);
  } catch (error) {
    console.warn('Failed to get channel summary:', error);
    return [];
  }
}

export async function detectBurnoutRisks() {
  try {
    // Simplified burnout detection for KV
    const channels = await getChannels();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    
    const consecutiveLowChannels = [];
    const decliningTrendChannels = [];
    const atRiskUsers: { [userId: string]: { sentiment_scores: number[], messages: number, channels: Set<string> } } = {};
    
    for (const channel of channels) {
      const messages = await kv.get<Message[]>(`messages:${channel.id}`) || [];
      const recentMessages = messages.filter(m => new Date(m.timestamp) >= cutoffDate);
      
      if (recentMessages.length > 0) {
        const avgSentiment = recentMessages.reduce((sum, m) => sum + m.sentiment_score, 0) / recentMessages.length;
        
        // Check for low sentiment channels
        if (avgSentiment < 4.0) {
          consecutiveLowChannels.push({
            channel_id: channel.id,
            streak_start: cutoffDate.toISOString().split('T')[0],
            streak_end: new Date().toISOString().split('T')[0],
            consecutive_days: 3, // Simplified
            avg_sentiment_in_streak: avgSentiment,
          });
        }
        
        // Track user sentiment
        recentMessages.forEach(msg => {
          if (!atRiskUsers[msg.user_id]) {
            atRiskUsers[msg.user_id] = { sentiment_scores: [], messages: 0, channels: new Set() };
          }
          atRiskUsers[msg.user_id].sentiment_scores.push(msg.sentiment_score);
          atRiskUsers[msg.user_id].messages++;
          atRiskUsers[msg.user_id].channels.add(msg.channel_id);
        });
      }
    }
    
    // Process at-risk users
    const userBurnoutRisks = Object.entries(atRiskUsers)
      .map(([userId, data]) => {
        const avgSentiment = data.sentiment_scores.reduce((sum, score) => sum + score, 0) / data.sentiment_scores.length;
        const negativePercentage = (data.sentiment_scores.filter(score => score < 4).length / data.sentiment_scores.length) * 100;
        
        return {
          user_id: userId,
          channels_active: data.channels.size,
          total_messages: data.messages,
          avg_sentiment: avgSentiment,
          lowest_sentiment: Math.min(...data.sentiment_scores),
          negative_message_percentage: negativePercentage,
          last_activity: new Date().toISOString(),
        };
      })
      .filter(user => user.avg_sentiment < 4.5 && user.negative_message_percentage > 30)
      .sort((a, b) => a.avg_sentiment - b.avg_sentiment);
    
    return {
      consecutive_low_channels: consecutiveLowChannels,
      declining_trend_channels: decliningTrendChannels,
      at_risk_users: userBurnoutRisks,
    };
  } catch (error) {
    console.warn('Failed to detect burnout risks:', error);
    return {
      consecutive_low_channels: [],
      declining_trend_channels: [],
      at_risk_users: [],
    };
  }
}

// Initialize database on import
initializeDatabase().catch(console.error);
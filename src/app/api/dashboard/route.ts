import { NextResponse } from 'next/server';
import { getChannelSummary, getChannelSentimentTrend, getMessages, getDailyMoodTrends, getWeeklyMoodTrends } from '@/lib/database';

export async function GET() {
  try {
    // Get comprehensive analysis data
    const channelSummary = await getChannelSummary();
    const dailyTrends = await getDailyMoodTrends(14);
    const weeklyTrends = await getWeeklyMoodTrends(8);
    const recentMessages = await getMessages(undefined, 10);
    
    // Get detailed trend data for each channel
    let channelTrends = [];
    for (const channel of channelSummary.slice(0, 3)) { // Limit to top 3 channels
      const trend = await getChannelSentimentTrend(channel.id, 7);
      channelTrends.push({
        channel_id: channel.id,
        channel_name: channel.name,
        trend_data: trend,
      });
    }
    
    // Calculate comprehensive stats
    const totalMessages = channelSummary.reduce((sum, channel) => sum + (channel.total_messages || 0), 0);
    const avgSentiment = channelSummary.length > 0 
      ? channelSummary.reduce((sum, channel) => sum + (parseFloat(channel.avg_sentiment) || 0), 0) / channelSummary.length
      : 0;
    
    const totalUsers = channelSummary.reduce((sum, channel) => sum + (channel.active_users || 0), 0);
    const avgBurnoutRisk = channelSummary.length > 0
      ? channelSummary.reduce((sum, channel) => sum + (parseFloat(channel.burnout_risk_percentage) || 0), 0) / channelSummary.length
      : 0;

    // Sentiment distribution
    const sentimentDistribution = {
      positive: 0,
      neutral: 0, 
      negative: 0,
    };

    channelSummary.forEach(channel => {
      const sentiment = parseFloat(channel.avg_sentiment || '5');
      if (sentiment >= 7) sentimentDistribution.positive++;
      else if (sentiment >= 4) sentimentDistribution.neutral++;
      else sentimentDistribution.negative++;
    });

    // Weekly comparison
    const weekly_comparison = weeklyTrends.length > 1 ? {
      current_week: parseFloat(weeklyTrends[weeklyTrends.length - 1]?.weekly_mood || '0'),
      previous_week: parseFloat(weeklyTrends[weeklyTrends.length - 2]?.weekly_mood || '0'),
      change_percentage: weeklyTrends.length > 1 ? 
        ((parseFloat(weeklyTrends[weeklyTrends.length - 1]?.weekly_mood || '0') - 
          parseFloat(weeklyTrends[weeklyTrends.length - 2]?.weekly_mood || '0')) / 
         parseFloat(weeklyTrends[weeklyTrends.length - 2]?.weekly_mood || '5') * 100).toFixed(1)
        : '0',
    } : null;

    // Add sentiment_distribution variable
    const sentiment_distribution = sentimentDistribution;
    
    return NextResponse.json({
      success: true,
      analysis_timestamp: new Date().toISOString(),
      summary: {
        total_channels: channelSummary.length,
        total_messages: totalMessages,
        total_active_users: totalUsers,
        avg_sentiment_all_channels: avgSentiment.toFixed(2),
        avg_burnout_risk: avgBurnoutRisk.toFixed(1),
        sentiment_health: avgSentiment >= 6.5 ? 'good' : avgSentiment >= 4.5 ? 'fair' : 'concerning',
        last_updated: new Date().toISOString(),
      },
      channels: channelSummary.map(channel => ({
        ...channel,
        avg_sentiment: parseFloat(channel.avg_sentiment || '0'),
        burnout_risk_percentage: parseFloat(channel.burnout_risk_percentage || '0'),
        sentiment_category: parseFloat(channel.avg_sentiment || '5') >= 7 ? 'positive' : 
                          parseFloat(channel.avg_sentiment || '5') >= 4 ? 'neutral' : 'negative',
      })),
      daily_trends: dailyTrends.map(day => ({
        ...day,
        overall_mood: parseFloat(day.overall_mood || '0'),
        positive_percentage: parseFloat(day.positive_percentage || '0'),
        negative_percentage: parseFloat(day.negative_percentage || '0'),
        neutral_percentage: parseFloat(day.neutral_percentage || '0'),
      })),
      weekly_trends: weeklyTrends.map(week => ({
        ...week,
        weekly_mood: parseFloat(week.weekly_mood || '0'),
        burnout_risk_percentage: parseFloat(week.burnout_risk_percentage || '0'),
      })),
      channel_trends: channelTrends,
      sentiment_distribution,
      weekly_comparison,
      insights: {
        top_performing_channel: channelSummary.length > 0 ? 
          channelSummary.reduce((best, current) => 
            parseFloat(current.avg_sentiment || '0') > parseFloat(best.avg_sentiment || '0') ? current : best
          ) : null,
        most_concerning_channel: channelSummary.length > 0 ?
          channelSummary.reduce((worst, current) => 
            parseFloat(current.avg_sentiment || '10') < parseFloat(worst.avg_sentiment || '10') ? current : worst
          ) : null,
        trend_direction: weekly_comparison ? 
          (parseFloat(weekly_comparison.change_percentage) > 2 ? 'improving' : 
           parseFloat(weekly_comparison.change_percentage) < -2 ? 'declining' : 'stable') : 'stable',
      },
      recent_activity: recentMessages.slice(0, 5).map(msg => ({
        channel_id: msg.channel_id,
        text: msg.text.substring(0, 80) + (msg.text.length > 80 ? '...' : ''),
        sentiment_score: msg.sentiment_score,
        timestamp: msg.timestamp,
        sentiment_label: msg.sentiment_score >= 7 ? 'positive' : 
                        msg.sentiment_score >= 4 ? 'neutral' : 'negative',
      })),
    });
    
  } catch (error: any) {
    console.error('Dashboard API error:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', details: error.message },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import { getChannelSummary, saveAlert, getAlerts, detectBurnoutRisks, getDailyMoodTrends, getWeeklyMoodTrends } from '@/lib/database';

export async function GET() {
  try {
    const alerts = await getAlerts();
    
    return NextResponse.json({
      success: true,
      alerts,
    });
  } catch (error: any) {
    console.error('Error fetching alerts:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch alerts', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    // Get comprehensive analysis data
    const channels = await getChannelSummary();
    const burnoutRisks = await detectBurnoutRisks();
    const dailyTrends = await getDailyMoodTrends(7);
    const weeklyTrends = await getWeeklyMoodTrends(4);
    
    const alerts = [];
    const insights = [];

    // Analyze burnout risks first (most critical)
    for (const risk of burnoutRisks.consecutive_low_channels) {
      const channelData = channels.find(c => c.id === risk.channel_id);
      const channelName = channelData?.name || `channel-${risk.channel_id.substring(0, 8)}`;
      
      const alertMessage = `🚨 CRITICAL: #${channelName} has ${risk.consecutive_days} consecutive days below 4.0 sentiment`;
      
      await saveAlert({
        channel_id: risk.channel_id,
        alert_type: 'burnout_critical',
        message: alertMessage,
      });

      alerts.push({
        channel_id: risk.channel_id,
        channel_name: channelName,
        alert_type: 'burnout_critical',
        severity: 'critical',
        sentiment_score: parseFloat(risk.avg_sentiment_in_streak),
        consecutive_days: risk.consecutive_days,
        streak_period: `${risk.streak_start} to ${risk.streak_end}`,
        message: alertMessage,
        manager_actions: [
          `🏃‍♂️ **IMMEDIATE**: Schedule urgent team meeting within 24 hours`,
          `🎯 **PRIORITY**: Identify root cause - recent changes, workload, conflicts`,
          `👥 **PEOPLE**: Conduct confidential 1:1s with key team members`,
          `📊 **METRICS**: Review sprint velocity, ticket complexity, deadline pressure`,
          `🔧 **INTERVENTION**: Consider temporary workload redistribution`,
        ],
        business_impact: `High risk of team productivity decline and potential talent attrition`,
      });
    }

    // Analyze declining trends
    for (const trend of burnoutRisks.declining_trend_channels) {
      const channelData = channels.find(c => c.id === trend.channel_id);
      const channelName = channelData?.name || `channel-${trend.channel_id.substring(0, 8)}`;
      
      const alertMessage = `⚠️ #${channelName} showing significant decline (trend: ${trend.trend_slope.toFixed(2)})`;

      alerts.push({
        channel_id: trend.channel_id,
        channel_name: channelName,
        alert_type: 'declining_trend',
        severity: 'warning',
        sentiment_score: parseFloat(trend.avg_sentiment),
        trend_slope: parseFloat(trend.trend_slope),
        message: alertMessage,
        manager_actions: [
          `📈 **MONITOR**: Track daily sentiment for next 3-5 days`,
          `🔍 **INVESTIGATE**: Review recent project milestones and deadlines`,
          `💬 **COMMUNICATE**: Increase transparency in team communications`,
          `🎯 **FOCUS**: Identify and remove process bottlenecks`,
          `🏆 **MOTIVATE**: Celebrate small wins and acknowledge contributions`,
        ],
        business_impact: `Moderate risk of decreased team engagement and output quality`,
      });
    }

    // User-level burnout analysis
    for (const user of burnoutRisks.at_risk_users) {
      insights.push({
        type: 'individual_risk',
        severity: user.avg_sentiment < 3.0 ? 'critical' : 'warning',
        user_id: user.user_id,
        avg_sentiment: parseFloat(user.avg_sentiment),
        negative_percentage: parseFloat(user.negative_message_percentage),
        channels_active: user.channels_active,
        manager_actions: [
          `👤 **1:1 MEETING**: Schedule private conversation within 48 hours`,
          `🎯 **WORKLOAD**: Review current assignments and deadlines`,
          `🤝 **SUPPORT**: Offer additional resources or mentoring`,
          `📅 **FLEXIBILITY**: Consider schedule adjustments or time off`,
          `🔄 **FOLLOW-UP**: Check in weekly for next month`,
        ],
        context: `Active in ${user.channels_active} channels, ${user.negative_message_percentage}% negative messages`,
      });
    }

    // Channel-level insights for basic alerts
    for (const channel of channels) {
      const avgSentiment = parseFloat(channel.avg_sentiment || '5');
      const burnoutPercentage = parseFloat(channel.burnout_risk_percentage || '0');
      const channelName = channel.name;
      const channelId = channel.id;

      if (avgSentiment < 4.0 && !alerts.find(a => a.channel_id === channelId)) {
        alerts.push({
          channel_id: channelId,
          channel_name: channelName,
          alert_type: 'low_sentiment',
          severity: 'high',
          sentiment_score: avgSentiment,
          burnout_percentage: burnoutPercentage,
          active_users: channel.active_users,
          message: `#${channelName} has low sentiment (${avgSentiment.toFixed(1)}/10)`,
          manager_actions: [
            `🔍 **ASSESS**: Review recent team dynamics and project status`,
            `💭 **FEEDBACK**: Gather anonymous team feedback`,
            `⚡ **QUICK WIN**: Identify immediate process improvements`,
            `📢 **COMMUNICATION**: Hold team retrospective within 1 week`,
            `🎯 **GOALS**: Clarify priorities and expectations`,
          ],
          business_impact: `${burnoutPercentage}% of messages show burnout risk signals`,
        });
      } else if (avgSentiment < 5.5 && !alerts.find(a => a.channel_id === channelId)) {
        alerts.push({
          channel_id: channelId,
          channel_name: channelName,
          alert_type: 'moderate_concern',
          severity: 'medium',
          sentiment_score: avgSentiment,
          active_users: channel.active_users,
          message: `#${channelName} sentiment declining (${avgSentiment.toFixed(1)}/10)`,
          manager_actions: [
            `📊 **TRACK**: Monitor sentiment daily for early intervention`,
            `🗣️ **ENGAGE**: Increase casual team interactions`,
            `🎉 **RECOGNIZE**: Highlight team achievements publicly`,
            `🔧 **OPTIMIZE**: Review and streamline workflows`,
            `📝 **DOCUMENT**: Create action plan for improvement`,
          ],
          business_impact: `Team morale at moderate risk, preventive action recommended`,
        });
      }
    }

    // Generate weekly insights summary
    const weeklyInsight = weeklyTrends.length > 0 ? {
      type: 'weekly_summary',
      current_week_mood: weeklyTrends[weeklyTrends.length - 1]?.weekly_mood,
      trend_direction: weeklyTrends.length > 1 ? 
        (weeklyTrends[weeklyTrends.length - 1].weekly_mood > weeklyTrends[weeklyTrends.length - 2].weekly_mood ? 'improving' : 'declining') 
        : 'stable',
      total_contributors: weeklyTrends[weeklyTrends.length - 1]?.unique_contributors,
      executive_summary: generateExecutiveSummary(alerts, weeklyTrends),
    } : null;

    return NextResponse.json({
      success: true,
      analysis_timestamp: new Date().toISOString(),
      summary: {
        critical_alerts: alerts.filter(a => a.severity === 'critical').length,
        warning_alerts: alerts.filter(a => a.severity === 'warning' || a.severity === 'high').length,
        individual_risks: burnoutRisks.at_risk_users.length,
        channels_analyzed: channels.length,
      },
      alerts,
      insights,
      weekly_insight: weeklyInsight,
      burnout_analysis: burnoutRisks,
    });
    
  } catch (error: any) {
    console.error('Error creating comprehensive alerts:', error);
    
    return NextResponse.json(
      { error: 'Failed to analyze team sentiment', details: error.message },
      { status: 500 }
    );
  }
}

function generateExecutiveSummary(alerts: any[], weeklyTrends: any[]): string {
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning' || a.severity === 'high').length;
  
  let summary = `Team Sentiment Analysis Summary:\n`;
  
  if (criticalCount > 0) {
    summary += `🚨 ${criticalCount} critical burnout risk(s) detected - immediate intervention required.\n`;
  }
  
  if (warningCount > 0) {
    summary += `⚠️ ${warningCount} moderate concern(s) identified - preventive action recommended.\n`;
  }
  
  if (criticalCount === 0 && warningCount === 0) {
    summary += `✅ No immediate sentiment risks detected. Team morale appears stable.\n`;
  }
  
  if (weeklyTrends.length > 1) {
    const trend = weeklyTrends[weeklyTrends.length - 1].weekly_mood > weeklyTrends[weeklyTrends.length - 2].weekly_mood;
    summary += `📈 Weekly trend: ${trend ? 'Improving' : 'Declining'} sentiment patterns.\n`;
  }
  
  summary += `\n💡 Focus areas: Team communication, workload management, and recognition programs.`;
  
  return summary;
}
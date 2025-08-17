import { NextRequest, NextResponse } from 'next/server';
import { getMessages } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');
    const sentiment = searchParams.get('sentiment'); // 'positive', 'negative', 'neutral'
    const days = parseInt(searchParams.get('days') || '7');

    // Get messages using the abstracted database function
    const allMessages = await getMessages(channelId, 200);
    
    // Filter messages based on time range and sentiment
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    let messagesWithReactions = allMessages
      .filter((msg: any) => new Date(msg.timestamp) >= cutoffDate)
      .filter((msg: any) => {
        if (sentiment === 'positive') return msg.sentiment_score >= 7;
        if (sentiment === 'negative') return msg.sentiment_score < 4;
        if (sentiment === 'neutral') return msg.sentiment_score >= 4 && msg.sentiment_score < 7;
        return true;
      })
      .sort((a: any, b: any) => {
        return sentiment === 'negative' ? a.sentiment_score - b.sentiment_score : b.sentiment_score - a.sentiment_score;
      });

    // Process messages and add mock reactions for demonstration
    const processedMessages = messagesWithReactions.map((msg: any) => {
      // Mock reactions based on sentiment score for demonstration
      const reactions = msg.sentiment_score >= 7 ? [
        { emoji: '👍', sentiment_value: 8.0 },
        { emoji: '🎉', sentiment_value: 9.0 },
      ] : msg.sentiment_score < 4 ? [
        { emoji: '😔', sentiment_value: 3.0 },
      ] : Math.random() > 0.7 ? [
        { emoji: '👍', sentiment_value: 7.0 },
      ] : [];

      return {
        id: msg.id,
        channel_id: msg.channel_id,
        user_id: msg.user_id,
        text: msg.text,
        timestamp: msg.timestamp,
        sentiment_score: msg.sentiment_score,
        sentiment_label: msg.sentiment_score >= 7 ? 'positive' : 
                        msg.sentiment_score >= 4 ? 'neutral' : 'negative',
        reactions: reactions,
        word_count: msg.text.split(/\s+/).length,
        has_reactions: reactions.length > 0,
      };
    });

    // Generate word frequency for word cloud
    const allText = processedMessages.map(m => m.text).join(' ');
    const words = allText.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter(word => 
        word.length > 2 && 
        !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'that', 'this', 'is', 'are', 'was', 'were', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'not', 'all', 'any', 'some', 'more', 'most', 'much', 'many', 'few', 'little', 'big', 'small', 'good', 'bad', 'new', 'old', 'first', 'last', 'long', 'short', 'high', 'low', 'right', 'left', 'next', 'back', 'here', 'there', 'where', 'when', 'why', 'how', 'what', 'who', 'which', 'than', 'then', 'now', 'just', 'only', 'also', 'even', 'well', 'still', 'again', 'very', 'too', 'really', 'quite', 'pretty', 'sure', 'maybe', 'probably', 'like', 'need', 'want', 'know', 'think', 'see', 'get', 'go', 'come', 'take', 'make', 'give', 'use', 'work', 'say', 'tell', 'ask', 'try', 'help'].includes(word)
      );

    const wordFreq: Record<string, number> = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Convert to array and sort
    const wordCloudData = Object.entries(wordFreq)
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 50); // Top 50 words

    // Generate insights based on the data
    const insights = generateInsights(processedMessages, wordCloudData);

    // Get most extreme examples
    const examples = {
      most_positive: processedMessages.filter(m => m.sentiment_label === 'positive').slice(0, 3),
      most_negative: processedMessages.filter(m => m.sentiment_label === 'negative').slice(0, 3),
      most_reactions: processedMessages
        .filter(m => m.has_reactions)
        .sort((a, b) => b.reactions.length - a.reactions.length)
        .slice(0, 3),
    };

    return NextResponse.json({
      success: true,
      channel_id: channelId,
      sentiment_filter: sentiment,
      days_analyzed: days,
      summary: {
        total_messages: processedMessages.length,
        sentiment_distribution: {
          positive: processedMessages.filter(m => m.sentiment_label === 'positive').length,
          neutral: processedMessages.filter(m => m.sentiment_label === 'neutral').length,
          negative: processedMessages.filter(m => m.sentiment_label === 'negative').length,
        },
        messages_with_reactions: processedMessages.filter(m => m.has_reactions).length,
        avg_sentiment: processedMessages.length > 0 ? 
          (processedMessages.reduce((sum, m) => sum + m.sentiment_score, 0) / processedMessages.length).toFixed(2) : '0',
        avg_word_count: processedMessages.length > 0 ?
          Math.round(processedMessages.reduce((sum, m) => sum + m.word_count, 0) / processedMessages.length) : 0,
      },
      messages: processedMessages.slice(0, 20), // Limit to first 20 for UI
      word_cloud_data: wordCloudData,
      insights,
      examples,
    });

  } catch (error: any) {
    console.error('Evidence API error:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch message evidence', details: error.message },
      { status: 500 }
    );
  }
}

function generateInsights(messages: any[], wordData: any[]): any[] {
  const insights = [];
  
  // Sentiment patterns
  const positiveCount = messages.filter(m => m.sentiment_label === 'positive').length;
  const negativeCount = messages.filter(m => m.sentiment_label === 'negative').length;
  const neutralCount = messages.filter(m => m.sentiment_label === 'neutral').length;
  
  if (negativeCount > positiveCount * 1.5) {
    insights.push({
      type: 'concern',
      title: 'Negative Sentiment Dominance',
      description: `${negativeCount} negative messages vs ${positiveCount} positive messages`,
      evidence: messages.filter(m => m.sentiment_label === 'negative').slice(0, 2),
      recommendation: 'Investigate root causes of team dissatisfaction',
    });
  }
  
  // Word patterns
  const stressWords = wordData.filter(w => 
    ['stress', 'tired', 'overwhelmed', 'frustrated', 'deadline', 'urgent', 'problem', 'issue', 'difficult', 'hard'].includes(w.text)
  );
  
  if (stressWords.length > 0) {
    insights.push({
      type: 'warning',
      title: 'Stress Indicators Detected',
      description: `Found ${stressWords.length} stress-related keywords`,
      evidence: stressWords,
      recommendation: 'Monitor workload and provide additional support',
    });
  }
  
  const positiveWords = wordData.filter(w => 
    ['great', 'awesome', 'excellent', 'good', 'happy', 'success', 'win', 'amazing', 'fantastic', 'love'].includes(w.text)
  );
  
  if (positiveWords.length > 0) {
    insights.push({
      type: 'positive',
      title: 'Positive Language Patterns',
      description: `Found ${positiveWords.length} positive keywords`,
      evidence: positiveWords,
      recommendation: 'Build on current positive momentum',
    });
  }
  
  // Reaction patterns
  const messagesWithReactions = messages.filter(m => m.has_reactions);
  if (messagesWithReactions.length > 0) {
    const avgReactionSentiment = messagesWithReactions.reduce((sum, m) => 
      sum + m.reactions.reduce((rSum: number, r: any) => rSum + r.sentiment_value, 0) / m.reactions.length, 0
    ) / messagesWithReactions.length;
    
    insights.push({
      type: 'engagement',
      title: 'Team Engagement Analysis',
      description: `${messagesWithReactions.length} messages have reactions (avg sentiment: ${avgReactionSentiment.toFixed(1)})`,
      evidence: messagesWithReactions.slice(0, 2),
      recommendation: avgReactionSentiment >= 6 ? 'High engagement - maintain current practices' : 'Low reaction engagement - encourage more interaction',
    });
  }
  
  return insights;
}
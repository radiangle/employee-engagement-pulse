import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { saveMessage, saveReaction } from '@/lib/database';
import Database from 'sqlite3';
import { promisify } from 'util';

const db = new Database.Database('./sentiment.db');
const dbRun = promisify(db.run.bind(db));

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// Rate limiting helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: NextRequest) {
  try {
    const { channelId, days = 7 } = await request.json();

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID required' }, { status: 400 });
    }

    if (!process.env.SLACK_BOT_TOKEN) {
      return NextResponse.json(
        { error: 'SLACK_BOT_TOKEN not configured' },
        { status: 500 }
      );
    }

    // Calculate timestamp for X days ago
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);
    const oldest = Math.floor(daysAgo.getTime() / 1000).toString();

    console.log(`Fetching messages from channel ${channelId} since ${daysAgo.toISOString()}`);

    // Fetch messages with pagination
    let allMessages: any[] = [];
    let cursor: string | undefined;
    let requestCount = 0;

    do {
      // Rate limiting: 1 request per second
      if (requestCount > 0) {
        await delay(1000);
      }
      
      const result = await slack.conversations.history({
        channel: channelId,
        oldest: oldest,
        limit: 100,
        cursor: cursor,
      });

      if (result.messages) {
        allMessages = [...allMessages, ...result.messages];
      }

      cursor = result.response_metadata?.next_cursor;
      requestCount++;

      // Safety limit
      if (requestCount > 10) break;

    } while (cursor);

    console.log(`Fetched ${allMessages.length} messages in ${requestCount} requests`);

    // Now fetch thread replies for messages that have them
    let threadMessages: any[] = [];
    let threadRequestCount = 0;

    for (const message of allMessages) {
      if (message.reply_count && message.reply_count > 0) {
        try {
          // Rate limiting
          await delay(1000);
          
          const threadResult = await slack.conversations.replies({
            channel: channelId,
            ts: message.ts,
            oldest: oldest,
          });

          if (threadResult.messages) {
            // Skip the parent message (first in replies) to avoid duplicates
            const replies = threadResult.messages.slice(1);
            threadMessages = [...threadMessages, ...replies];
            threadRequestCount++;
          }
        } catch (threadError) {
          console.warn(`Failed to fetch thread for message ${message.ts}:`, threadError);
        }
      }
    }

    console.log(`Fetched ${threadMessages.length} thread messages in ${threadRequestCount} additional requests`);
    
    // Combine main messages and thread replies
    const allMessagesWithThreads = [...allMessages, ...threadMessages];
    requestCount += threadRequestCount;

    // Process messages (will add sentiment analysis later)
    const processedMessages = [];
    
    for (const message of allMessagesWithThreads) {
      if (message.text && message.user && message.ts) {
        const messageData = {
          channel_id: channelId,
          user_id: message.user,
          text: message.text,
          timestamp: new Date(parseFloat(message.ts) * 1000).toISOString(),
          sentiment_score: 5.0, // Placeholder, will be analyzed later
        };

        // Save message to database
        const savedMessage = await saveMessage(messageData);
        processedMessages.push(messageData);

        // Process reactions if they exist and calculate combined sentiment
        let reactionSentimentSum = 0;
        let reactionCount = 0;
        
        if (message.reactions) {
          for (const reaction of message.reactions) {
            const emojiSentiment = getEmojiSentiment(reaction.name);
            const count = reaction.count || 1;
            
            // Weight by reaction count
            reactionSentimentSum += emojiSentiment * count;
            reactionCount += count;
            
            await saveReaction({
              message_id: savedMessage.lastID as number,
              emoji: reaction.name,
              sentiment_value: emojiSentiment,
            });
          }
        }
        
        // Calculate combined sentiment (70% text, 30% reactions) if reactions exist
        if (reactionCount > 0) {
          const avgReactionSentiment = reactionSentimentSum / reactionCount;
          const combinedSentiment = (messageData.sentiment_score * 0.7) + (avgReactionSentiment * 0.3);
          
          // Update the message with combined sentiment
          await dbRun(
            'UPDATE messages SET sentiment_score = ? WHERE id = ?',
            [combinedSentiment, savedMessage.lastID]
          );
          
          messageData.sentiment_score = combinedSentiment;
        }
      }
    }

    return NextResponse.json({
      success: true,
      channel_id: channelId,
      main_messages_fetched: allMessages.length,
      thread_messages_fetched: threadMessages.length,
      total_messages_fetched: allMessagesWithThreads.length,
      messages_processed: processedMessages.length,
      requests_made: requestCount,
      date_range: {
        from: daysAgo.toISOString(),
        to: new Date().toISOString(),
      },
    });

  } catch (error: any) {
    console.error('Error fetching messages:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch messages',
        details: error.message,
        code: error.data?.error || 'unknown_error',
      },
      { status: 500 }
    );
  }
}

// Comprehensive emoji sentiment mapping
function getEmojiSentiment(emoji: string): number {
  const emojiMap: Record<string, number> = {
    // Very Positive (9-10)
    'joy': 10, 'grinning': 9, 'heart_eyes': 10, 'heart': 9, 'tada': 10,
    'fire': 9, 'rocket': 9, 'star': 9, 'sparkles': 9, 'clap': 9,
    'raised_hands': 9, 'muscle': 9, 'trophy': 10, 'crown': 9,
    
    // Positive (7-8)  
    'smile': 8, 'thumbsup': 8, '+1': 8, 'ok_hand': 7, 'wave': 7,
    'wink': 7, 'relaxed': 7, 'blush': 7, 'sunglasses': 8, 'cool': 8,
    'laughing': 8, 'smiley': 8, 'grin': 8, 'beaming_face_with_smiling_eyes': 8,
    
    // Slightly Positive (6)
    'slightly_smiling_face': 6, 'upside_down_face': 6, 'innocent': 6,
    
    // Neutral (5)
    'thinking_face': 5, 'neutral_face': 5, 'expressionless': 5, 'shrug': 5,
    'face_with_raised_eyebrow': 5, 'eyes': 5, 'zipper_mouth_face': 5,
    
    // Slightly Negative (4)
    'confused': 4, 'unamused': 4, 'rolling_eyes': 4, 'grimacing': 4,
    'hushed': 4, 'flushed': 4,
    
    // Negative (2-3)
    'disappointed': 3, 'worried': 3, 'frowning': 3, 'pensive': 3,
    'tired_face': 3, 'weary': 2, 'persevere': 3, 'confounded': 2,
    'thumbsdown': 2, '-1': 2, 'no_good': 2, 'x': 2,
    
    // Very Negative (1-2)
    'cry': 2, 'sob': 1, 'angry': 1, 'rage': 1, 'face_with_symbols_on_mouth': 1,
    'triumph': 2, 'disappointed_relieved': 2, 'fearful': 1, 'cold_sweat': 2,
    
    // Work/Productivity Context
    'coffee': 6, 'computer': 6, 'memo': 6, 'calendar': 5, 'clock': 5,
    'hourglass_flowing_sand': 4, 'alarm_clock': 4, 'sos': 2, 'warning': 3,
    
    // Team/Collaboration
    'handshake': 8, 'raised_hand': 7, 'point_up': 6, 'heavy_check_mark': 8,
    'white_check_mark': 8, 'ballot_box_with_check': 7, 'question': 5,
    'exclamation': 4, 'double_exclamation_mark': 3,
  };

  return emojiMap[emoji] || 5; // Default neutral sentiment
}
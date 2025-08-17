import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getMessages } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { channelId, messageIds, reanalyze = false } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Get messages to analyze
    let messages;
    if (messageIds && messageIds.length > 0) {
      // Analyze specific messages (not implemented in this demo)
      messages = [];
    } else if (channelId) {
      messages = await getMessages(channelId);
    } else {
      messages = await getMessages();
    }

    if (messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages found to analyze' },
        { status: 404 }
      );
    }

    console.log(`Analyzing sentiment for ${messages.length} messages`);

    const analyzedMessages = [];
    let successCount = 0;
    let errorCount = 0;

    for (const message of messages) {
      try {
        // Skip if already analyzed and not reanalyzing
        if (message.sentiment_score && message.sentiment_score !== 5.0 && !reanalyze) {
          analyzedMessages.push({
            id: message.id,
            text: message.text.substring(0, 100) + '...',
            sentiment_score: message.sentiment_score,
            status: 'skipped',
          });
          continue;
        }

        // Clean message text
        const cleanText = message.text
          .replace(/<@[A-Z0-9]+>/g, '@user') // Replace user mentions
          .replace(/<#[A-Z0-9]+\|[^>]+>/g, '#channel') // Replace channel mentions  
          .replace(/https?:\/\/[^\s]+/g, '[link]') // Replace URLs
          .trim();

        if (cleanText.length < 3) {
          // Too short to analyze meaningfully
          analyzedMessages.push({
            id: message.id,
            text: cleanText,
            sentiment_score: 5.0,
            status: 'skipped_short',
          });
          continue;
        }

        // Call Vercel AI with OpenAI
        const { text: sentimentResponse } = await generateText({
          model: openai('gpt-3.5-turbo'),
          prompt: `Rate the sentiment of this workplace message on a scale of 1-10 where:
1 = very negative (angry, frustrated, upset)
2-3 = negative (disappointed, concerned, unhappy)  
4-5 = neutral (informational, factual, neither positive nor negative)
6-7 = positive (pleased, satisfied, optimistic)
8-10 = very positive (excited, enthusiastic, delighted)

Message: "${cleanText}"

Respond with only a single number between 1 and 10:`,
          maxTokens: 10,
          temperature: 0.1,
        });

        // Parse sentiment score
        const sentimentScore = parseFloat(sentimentResponse.trim());
        
        if (isNaN(sentimentScore) || sentimentScore < 1 || sentimentScore > 10) {
          console.warn(`Invalid sentiment score: ${sentimentResponse} for message: ${cleanText.substring(0, 50)}`);
          analyzedMessages.push({
            id: message.id,
            text: cleanText.substring(0, 100) + '...',
            sentiment_score: 5.0,
            status: 'error_invalid_score',
          });
          errorCount++;
          continue;
        }

        // Update message sentiment score (handled internally)
        // Note: In production, this would update the database record

        analyzedMessages.push({
          id: message.id,
          text: cleanText.substring(0, 100) + '...',
          sentiment_score: sentimentScore,
          status: 'analyzed',
        });
        
        successCount++;

        // Rate limiting: small delay between API calls
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        console.error(`Error analyzing message ${message.id}:`, error);
        analyzedMessages.push({
          id: message.id,
          text: message.text.substring(0, 100) + '...',
          sentiment_score: 5.0,
          status: 'error',
          error: error.message,
        });
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      total_messages: messages.length,
      analyzed: successCount,
      errors: errorCount,
      skipped: messages.length - successCount - errorCount,
      channel_id: channelId,
      sample_results: analyzedMessages.slice(0, 10), // Show first 10 for debugging
    });

  } catch (error: any) {
    console.error('Sentiment analysis error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to analyze sentiment',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
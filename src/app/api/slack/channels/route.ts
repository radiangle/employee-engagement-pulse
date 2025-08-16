import { NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { saveChannel } from '@/lib/database';

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

export async function GET() {
  try {
    if (!process.env.SLACK_BOT_TOKEN) {
      return NextResponse.json(
        { error: 'SLACK_BOT_TOKEN not configured' },
        { status: 500 }
      );
    }

    // Test authentication first
    const authTest = await slack.auth.test();
    
    // Since we don't have conversations:read scope, we'll work with the channel ID from env
    const channelId = process.env.CHANNEL_ID_HERE;
    
    if (!channelId) {
      return NextResponse.json({
        success: false,
        error: 'No channel configured',
        message: 'Please set CHANNEL_ID_HERE in .env.local',
        bot_info: {
          user: authTest.user,
          team: authTest.team,
        },
        available_scopes: ['channels:history', 'channels:read', 'reactions:read', 'users:read'],
        channels: [],
      });
    }

    // Since we have scope limitations, just use the configured channel directly
    const accessibleChannels = [{
      id: channelId,
      name: `channel-${channelId.substring(0, 8)}`,
      is_member: true,
      member_count: 10, // Mock value
    }];

    // Save to database (handle errors gracefully in serverless environment)
    try {
      await saveChannel({
        id: channelId,
        name: `channel-${channelId.substring(0, 8)}`,
      });
    } catch (dbError) {
      console.warn('Database not available, skipping channel save:', dbError);
    }

    return NextResponse.json({
      success: true,
      bot_info: {
        user: authTest.user,
        team: authTest.team,
      },
      channels: accessibleChannels,
      total_channels: 1,
      accessible_channels: 1,
      note: 'Using configured channel from CHANNEL_ID_HERE environment variable',
      available_scopes: ['channels:history', 'channels:read', 'reactions:read', 'users:read'],
    });

  } catch (error: any) {
    console.error('Slack API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to connect to Slack',
        details: error.message,
        code: error.data?.error || 'unknown_error',
        available_scopes: error.data?.response_metadata?.scopes || ['channels:history', 'channels:read', 'reactions:read', 'users:read'],
        message: 'Bot token has limited scopes. Using configured channel ID instead.',
      },
      { status: 200 } // Return 200 so the UI can handle this gracefully
    );
  }
}
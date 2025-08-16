'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { RefreshCw, AlertTriangle, TrendingDown, TrendingUp, Download, MessageCircle, Eye } from 'lucide-react';
import WordCloud from '@/components/WordCloud';

interface Channel {
  id: string;
  name: string;
  avg_sentiment: number;
  total_messages: number;
  last_message: string;
}

interface TrendData {
  date: string;
  avg_sentiment: number;
  message_count: number;
}

export default function Dashboard() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string>('');
  const [messageInsights, setMessageInsights] = useState<any>(null);
  const [wordCloudData, setWordCloudData] = useState<{ text: string; value: number }[]>([]);
  const [dataSource, setDataSource] = useState<'sample' | 'slack'>('sample');

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard');
      if (response.ok) {
        const data = await response.json();
        console.log('Dashboard data:', data);
        if (data.channels) {
          setChannels(data.channels);
        }
        if (data.trend_data) {
          setTrendData(data.trend_data);
        }
        if (data.channels.length > 0) {
          setSelectedChannel(data.channels[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  // Fetch message insights for word cloud and examples
  const fetchMessageInsights = async () => {
    try {
      if (!selectedChannel) return;
      
      console.log('Fetching message insights for channel:', selectedChannel);
      const response = await fetch(`/api/messages/evidence?channelId=${selectedChannel}&days=7`);
      if (response.ok) {
        const data = await response.json();
        console.log('Message insights data:', data);
        setMessageInsights(data);
        setWordCloudData(data.word_cloud_data || []);
      } else {
        console.error('Failed to fetch message insights:', response.status);
      }
    } catch (error) {
      console.error('Error fetching message insights:', error);
    }
  };

  // Mock data for demonstration when no real data
  useEffect(() => {
    fetchDashboardData().then(() => {
      // If no real data, use mock data
      const mockChannels = [
        { id: 'C1', name: 'general', avg_sentiment: 6.8, total_messages: 43, last_message: '2025-01-15T10:30:00Z' },
        { id: 'CDTPC3FKL', name: 'channel-CDTPC3FK', avg_sentiment: 7.2, total_messages: 43, last_message: '2025-01-15T11:15:00Z' },
      ];
      
      setChannels(prev => prev.length > 0 ? prev : mockChannels);
      
      // Set default selected channel
      if (!selectedChannel) {
        setSelectedChannel(mockChannels[0].id);
      }

      setTrendData(prev => prev.length > 0 ? prev : [
        { date: '2025-01-08', avg_sentiment: 6.2, message_count: 5 },
        { date: '2025-01-09', avg_sentiment: 6.8, message_count: 8 },
        { date: '2025-01-10', avg_sentiment: 7.5, message_count: 12 },
        { date: '2025-01-11', avg_sentiment: 6.9, message_count: 7 },
        { date: '2025-01-12', avg_sentiment: 7.3, message_count: 9 },
        { date: '2025-01-13', avg_sentiment: 7.1, message_count: 2 },
      ]);

      // Add mock message insights if none exist
      if (!messageInsights) {
        const mockMessageInsights = {
          summary: {
            total_messages: 63,
            avg_sentiment: '7.0',
            messages_with_reactions: 14,
            avg_word_count: 25,
            sentiment_distribution: {
              positive: 35,
              neutral: 20,
              negative: 8,
            }
          },
          insights: [
            {
              type: 'positive',
              title: 'High Team Engagement',
              description: 'Team shows strong collaboration with 22% of messages receiving reactions',
              evidence: [
                { text: 'great', value: 8 },
                { text: 'awesome', value: 5 }
              ],
              recommendation: 'Continue fostering this positive engagement culture'
            },
            {
              type: 'engagement',
              title: 'Active Discussion Patterns',
              description: 'High interaction levels indicate healthy team communication',
              evidence: [
                { text: 'thanks', value: 12 },
                { text: 'help', value: 7 }
              ],
              recommendation: 'Maintain current communication practices'
            }
          ],
          examples: {
            most_positive: [
              {
                text: 'Great job everyone on shipping the new feature! The client feedback has been fantastic.',
                sentiment_score: 8.5,
                timestamp: '2025-01-15T14:30:00Z',
                user_id: 'U12345678',
                reactions: [{ emoji: '🎉', sentiment_value: 9.0 }, { emoji: '👏', sentiment_value: 8.5 }]
              },
              {
                text: 'Love the collaboration on this project. Everyone is really stepping up!',
                sentiment_score: 8.2,
                timestamp: '2025-01-15T10:15:00Z',
                user_id: 'U23456789',
                reactions: [{ emoji: '❤️', sentiment_value: 9.0 }, { emoji: '🚀', sentiment_value: 8.0 }]
              }
            ],
            most_negative: [
              {
                text: 'This deadline is really stressing me out. Not sure we can make it with current resources.',
                sentiment_score: 3.2,
                timestamp: '2025-01-15T11:45:00Z',
                user_id: 'U34567890',
                reactions: [{ emoji: '😅', sentiment_value: 4.0 }]
              }
            ],
            most_reactions: [
              {
                text: 'Who wants to grab lunch together? Found a great new place!',
                sentiment_score: 7.5,
                timestamp: '2025-01-15T12:00:00Z',
                user_id: 'U45678901',
                reactions: [
                  { emoji: '🍕', sentiment_value: 8.0 },
                  { emoji: '👍', sentiment_value: 7.0 },
                  { emoji: '🙋‍♀️', sentiment_value: 7.5 },
                  { emoji: '🤤', sentiment_value: 8.5 }
                ]
              }
            ]
          },
          word_cloud_data: [
            { text: 'project', value: 15 },
            { text: 'team', value: 12 },
            { text: 'great', value: 10 },
            { text: 'help', value: 8 },
            { text: 'thanks', value: 7 },
            { text: 'meeting', value: 6 },
            { text: 'deadline', value: 5 },
            { text: 'feature', value: 4 }
          ]
        };
        setMessageInsights(mockMessageInsights);
        setWordCloudData(mockMessageInsights.word_cloud_data);
      }
    });

    setLastRefresh(new Date().toLocaleTimeString());
  }, []);

  // Fetch message insights when channel is selected
  useEffect(() => {
    if (selectedChannel) {
      fetchMessageInsights();
    }
  }, [selectedChannel]);

  const handleRefreshData = async () => {
    setLoading(true);
    await fetchDashboardData();
    if (selectedChannel) {
      await fetchMessageInsights();
    }
    setLastRefresh(new Date().toLocaleTimeString());
    setLoading(false);
  };

  const loadSampleSlackData = async () => {
    setLoading(true);
    try {
      // Step 1: Fetch channels from pre-configured Slack workspace
      console.log('Loading sample Slack channels...');
      const channelsResponse = await fetch('/api/slack/channels');
      if (!channelsResponse.ok) {
        throw new Error('Failed to fetch sample Slack channels');
      }
      
      // Step 2: Fetch messages from sample channel
      console.log('Fetching messages from sample Slack workspace...');
      const messagesResponse = await fetch('/api/slack/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 7 })
      });
      
      if (!messagesResponse.ok) {
        throw new Error('Failed to fetch sample Slack messages');
      }
      
      // Step 3: Analyze sentiment
      console.log('Analyzing sentiment of sample data...');
      const sentimentResponse = await fetch('/api/sentiment/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analyze_all: true })
      });
      
      if (!sentimentResponse.ok) {
        throw new Error('Failed to analyze sentiment');
      }
      
      // Step 4: Refresh dashboard with new data
      console.log('Loading dashboard with sample data...');
      await fetchDashboardData();
      if (selectedChannel) {
        await fetchMessageInsights();
      }
      
      setLastRefresh(new Date().toLocaleTimeString());
      setDataSource('slack');
      alert('✅ Sample Slack data loaded! You\'re now viewing real team engagement analytics from a demo workspace.');
      
    } catch (error) {
      console.error('Error loading sample Slack data:', error);
      alert('❌ Failed to load sample data. This feature requires Slack API configuration.');
    }
    setLoading(false);
  };

  const getSentimentColor = (score: number) => {
    if (score >= 7) return 'text-green-600';
    if (score >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSentimentBgColor = (score: number) => {
    if (score >= 7) return 'bg-green-100 border-green-200';
    if (score >= 5) return 'bg-yellow-100 border-yellow-200';
    return 'bg-red-100 border-red-200';
  };

  const getAlertType = (score: number) => {
    if (score < 4) return { type: 'Red Alert', icon: AlertTriangle, color: 'text-red-600' };
    if (score < 5.5) return { type: 'Yellow Warning', icon: TrendingDown, color: 'text-yellow-600' };
    return { type: 'Healthy', icon: TrendingUp, color: 'text-green-600' };
  };

  const exportData = () => {
    const csvContent = [
      'Channel,Average Sentiment,Total Messages,Last Message',
      ...channels.map(c => `${c.name},${c.avg_sentiment},${c.total_messages},${c.last_message}`)
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentiment-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Team Engagement Analytics</h1>
              <p className="text-gray-600 mt-1">Real-time sentiment analysis, communication insights, and team wellness monitoring</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={exportData}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download size={16} />
                Export CSV
              </button>
              <button
                onClick={handleRefreshData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <Link
                href="/messages"
                className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 border border-purple-300 rounded-lg hover:bg-purple-200 transition-colors"
              >
                <Eye size={16} />
                Raw Messages
              </Link>
            </div>
          </div>
          {lastRefresh && (
            <p className="text-sm text-gray-500 mt-2">Last updated: {lastRefresh}</p>
          )}
        </div>

        {/* Executive Summary */}
        {messageInsights && messageInsights.summary && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg p-6 mb-8 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="text-4xl">
                {parseFloat(messageInsights.summary.avg_sentiment || '0') >= 7 ? '🚀' : 
                 parseFloat(messageInsights.summary.avg_sentiment || '0') >= 5 ? '📊' : '⚠️'}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                  📋 Executive Summary
                </h2>
                <p className="text-blue-100 leading-relaxed">
                  <strong>Team Health Status:</strong> {' '}
                  {parseFloat(messageInsights.summary.avg_sentiment || '0') >= 7 
                    ? 'Your team is thriving with high engagement and positive sentiment' 
                    : parseFloat(messageInsights.summary.avg_sentiment || '0') >= 5 
                    ? 'Your team shows moderate engagement with room for improvement' 
                    : 'Your team may need attention - low sentiment detected across communications'
                  }. Analyzed <strong>{messageInsights.summary.total_messages || 0} messages</strong> with an average sentiment score of <strong>{messageInsights.summary.avg_sentiment}/10</strong>. 
                  {' '}<strong>{messageInsights.summary.sentiment_distribution?.positive || 0}</strong> messages show positive sentiment while <strong>{messageInsights.summary.sentiment_distribution?.negative || 0}</strong> need attention. 
                  Team interaction is {((messageInsights.summary.messages_with_reactions || 0) / Math.max((messageInsights.summary.total_messages || 1), 1)) >= 0.3 
                    ? 'highly active with strong engagement through reactions and responses'
                    : 'showing low interaction levels - consider encouraging more team collaboration'
                  }. 
                  {messageInsights.insights && messageInsights.insights.length > 0 
                    ? ` Key concerns include: ${messageInsights.insights.filter(i => i.type === 'concern' || i.type === 'warning').map(i => i.title.toLowerCase()).slice(0, 2).join(' and ')}.`
                    : ' No major concerns detected in current communications.'
                  }
                  {' '}<strong>Recommended Action:</strong> {
                    parseFloat(messageInsights.summary.avg_sentiment || '0') >= 7 
                      ? 'Maintain current positive momentum and recognition practices.'
                      : parseFloat(messageInsights.summary.avg_sentiment || '0') >= 5
                      ? 'Focus on increasing team engagement and addressing moderate concerns.'
                      : 'Immediate intervention recommended - schedule team check-ins and address underlying issues.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Alert Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {channels.map((channel) => {
            const alert = getAlertType(channel.avg_sentiment);
            const IconComponent = alert.icon;
            
            return (
              <div
                key={channel.id}
                className={`p-6 rounded-lg border-2 ${getSentimentBgColor(channel.avg_sentiment)} cursor-pointer transition-transform hover:scale-105`}
                onClick={() => setSelectedChannel(channel.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">#{channel.name}</h3>
                  <IconComponent size={20} className={alert.color} />
                </div>
                <div className={`text-2xl font-bold ${getSentimentColor(channel.avg_sentiment)}`}>
                  {channel.avg_sentiment.toFixed(1)}/10
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  {channel.total_messages} messages
                </div>
                <div className={`text-xs mt-1 ${alert.color} font-medium`}>
                  {alert.type}
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Trend Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Sentiment Trend (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: any) => [value.toFixed(1), 'Sentiment']}
                />
                <Line 
                  type="monotone" 
                  dataKey="avg_sentiment" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Channel Comparison */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Channel Sentiment Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={channels}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: any) => [value.toFixed(1), 'Sentiment']} />
                <Bar 
                  dataKey="avg_sentiment" 
                  fill="#3B82F6"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Comprehensive Message Analysis Section */}
        {messageInsights && (
          <>
            {/* Combined Analytics Overview */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    🔍 Message Analysis Dashboard
                  </h2>
                  <p className="text-gray-600 mt-1">Real-time insights from team communications</p>
                </div>
                <Link
                  href="/messages"
                  className="bg-white px-4 py-2 rounded-lg border shadow-sm hover:shadow-md transition-shadow flex items-center gap-2"
                >
                  <MessageCircle size={16} />
                  Detailed Analysis
                </Link>
              </div>

              {/* Message Summary Stats */}
              {messageInsights.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <div className="text-2xl font-bold text-blue-600">{messageInsights.summary.total_messages || 0}</div>
                    <div className="text-sm text-gray-600">Total Messages</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <div className="text-2xl font-bold text-green-600">{messageInsights.summary.avg_sentiment || '0'}/10</div>
                    <div className="text-sm text-gray-600">Avg Sentiment</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <div className="text-2xl font-bold text-purple-600">{messageInsights.summary.messages_with_reactions || 0}</div>
                    <div className="text-sm text-gray-600">With Reactions</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <div className="text-2xl font-bold text-orange-600">{Math.round(messageInsights.summary.avg_word_count || 0)}</div>
                    <div className="text-sm text-gray-600">Avg Words</div>
                  </div>
                </div>
              )}
            </div>

            {/* Integrated Word Cloud and Key Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Word Cloud */}
              {wordCloudData.length > 0 && (
                <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        🏷️ Communication Themes
                        <span className="text-sm text-gray-500">({wordCloudData.length} words)</span>
                      </h3>
                      <p className="text-sm text-gray-600">Most discussed topics in team messages</p>
                    </div>
                  </div>
                  <WordCloud data={wordCloudData} width={600} height={350} />
                </div>
              )}

              {/* Complete AI Insights Analysis */}
              {messageInsights.insights && messageInsights.insights.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    🧠 Complete AI Analysis & Insights
                  </h3>
                  <div className="space-y-4">
                    {messageInsights.insights.map((insight: any, index: number) => (
                      <div key={index} className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">
                            {insight.type === 'concern' ? '🚨' : 
                             insight.type === 'warning' ? '⚠️' : 
                             insight.type === 'positive' ? '✅' : 
                             insight.type === 'engagement' ? '💬' : '💡'}
                          </span>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-2">{insight.title}</h4>
                            <p className="text-sm text-gray-700 mb-3">{insight.description}</p>
                            <p className="text-sm text-blue-700 italic mb-3">💡 <strong>Recommendation:</strong> {insight.recommendation}</p>
                            
                            {/* Supporting Evidence */}
                            {insight.evidence && insight.evidence.length > 0 && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                                <p className="text-xs text-gray-600 font-medium mb-2">📊 Supporting Evidence:</p>
                                <div className="space-y-2">
                                  {insight.evidence.map((evidence: any, i: number) => (
                                    <div key={i} className="text-xs">
                                      {evidence.text && evidence.value ? (
                                        <div className="flex items-center justify-between p-2 bg-white border rounded">
                                          <span className="font-mono text-blue-600">"{evidence.text}"</span>
                                          <span className="text-gray-500 font-medium">{evidence.value} times</span>
                                        </div>
                                      ) : evidence.sentiment_score ? (
                                        <div className="p-2 bg-white border rounded">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs ${getSentimentColor(evidence.sentiment_score)}`}>
                                              {evidence.sentiment_score?.toFixed(1)}
                                            </span>
                                            <span className="text-gray-500 text-xs">
                                              {new Date(evidence.timestamp).toLocaleDateString()}
                                            </span>
                                          </div>
                                          <p className="text-gray-700">"{evidence.text?.substring(0, 120)}{evidence.text?.length > 120 ? '...' : ''}"</p>
                                          {evidence.reactions && evidence.reactions.length > 0 && (
                                            <div className="mt-1 flex gap-1">
                                              {evidence.reactions.map((reaction: any, ri: number) => (
                                                <span key={ri} className="text-sm">{reaction.emoji}</span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Comprehensive Text Analysis */}
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                📊 Communication Analysis & Text Insights
              </h3>
              
              {/* Sentiment Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {messageInsights.summary?.sentiment_distribution?.positive || 0}
                  </div>
                  <div className="text-sm text-gray-600 mb-3">Positive Messages</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ 
                        width: `${((messageInsights.summary?.sentiment_distribution?.positive || 0) / Math.max((messageInsights.summary?.total_messages || 1), 1) * 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    {messageInsights.summary?.sentiment_distribution?.negative || 0}
                  </div>
                  <div className="text-sm text-gray-600 mb-3">Needs Attention</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-600 h-2 rounded-full" 
                      style={{ 
                        width: `${((messageInsights.summary?.sentiment_distribution?.negative || 0) / Math.max((messageInsights.summary?.total_messages || 1), 1) * 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {Math.round(((messageInsights.summary?.messages_with_reactions || 0) / Math.max((messageInsights.summary?.total_messages || 1), 1)) * 100)}%
                  </div>
                  <div className="text-sm text-gray-600 mb-3">Engagement Rate</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ 
                        width: `${((messageInsights.summary?.messages_with_reactions || 0) / Math.max((messageInsights.summary?.total_messages || 1), 1)) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Text Analysis Insights */}
              <div className="border-t pt-6">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  🔍 Detailed Text Analysis
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Communication Patterns */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-medium mb-3 text-gray-900">📈 Communication Patterns</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Average message length:</span>
                        <span className="font-medium">{messageInsights.summary?.avg_word_count || 0} words</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Messages analyzed:</span>
                        <span className="font-medium">{messageInsights.summary?.total_messages || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reaction engagement:</span>
                        <span className="font-medium">
                          {messageInsights.summary?.messages_with_reactions || 0} messages 
                          ({Math.round(((messageInsights.summary?.messages_with_reactions || 0) / Math.max((messageInsights.summary?.total_messages || 1), 1)) * 100)}%)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Team sentiment score:</span>
                        <span className={`font-medium ${getSentimentColor(parseFloat(messageInsights.summary?.avg_sentiment || '0'))}`}>
                          {messageInsights.summary?.avg_sentiment || '0'}/10
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Top Discussion Topics */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-medium mb-3 text-gray-900">🏷️ Top Discussion Topics</h5>
                    <div className="space-y-2">
                      {wordCloudData.slice(0, 8).map((word, index) => (
                        <div key={word.text} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                              #{index + 1}
                            </span>
                            <span className="text-sm font-medium">{word.text}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-1">
                              <div 
                                className="bg-blue-600 h-1 rounded-full" 
                                style={{ width: `${(word.value / Math.max(...wordCloudData.map(w => w.value))) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-500 w-8 text-right">{word.value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-time Sentiment Analysis */}
              <div className="border-t pt-6 mt-6">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  🧠 AI Sentiment Analysis Summary
                </h4>
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl mb-2">
                        {messageInsights.summary?.sentiment_distribution?.positive > messageInsights.summary?.sentiment_distribution?.negative ? '😊' : 
                         messageInsights.summary?.sentiment_distribution?.negative > messageInsights.summary?.sentiment_distribution?.positive ? '😟' : '😐'}
                      </div>
                      <div className="text-sm font-medium">Overall Mood</div>
                      <div className="text-xs text-gray-600">
                        {messageInsights.summary?.sentiment_distribution?.positive > messageInsights.summary?.sentiment_distribution?.negative ? 'Positive' : 
                         messageInsights.summary?.sentiment_distribution?.negative > messageInsights.summary?.sentiment_distribution?.positive ? 'Needs attention' : 'Neutral'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl mb-2">
                        {parseFloat(messageInsights.summary?.avg_sentiment || '0') >= 7 ? '🚀' : 
                         parseFloat(messageInsights.summary?.avg_sentiment || '0') >= 5 ? '📈' : '⚠️'}
                      </div>
                      <div className="text-sm font-medium">Engagement Level</div>
                      <div className="text-xs text-gray-600">
                        {parseFloat(messageInsights.summary?.avg_sentiment || '0') >= 7 ? 'High energy' : 
                         parseFloat(messageInsights.summary?.avg_sentiment || '0') >= 5 ? 'Moderate' : 'Low engagement'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl mb-2">
                        {((messageInsights.summary?.messages_with_reactions || 0) / Math.max((messageInsights.summary?.total_messages || 1), 1)) >= 0.3 ? '🎯' : '💬'}
                      </div>
                      <div className="text-sm font-medium">Team Interaction</div>
                      <div className="text-xs text-gray-600">
                        {((messageInsights.summary?.messages_with_reactions || 0) / Math.max((messageInsights.summary?.total_messages || 1), 1)) >= 0.3 ? 'Active discussion' : 'One-way communication'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Comprehensive Message Analysis */}
            {messageInsights.examples && (
              <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                    📝 Complete Message Analysis
                  </h3>
                  <p className="text-sm text-gray-600">Detailed examination of team communications with sentiment scores and reactions</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Most Positive Messages */}
                  {messageInsights.examples.most_positive?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-green-700 mb-4 flex items-center gap-2">
                        <TrendingUp size={18} />
                        Positive Messages ({messageInsights.examples.most_positive.length})
                      </h4>
                      <div className="space-y-3">
                        {messageInsights.examples.most_positive.map((msg: any, index: number) => (
                          <div key={index} className="p-4 border border-green-200 rounded-lg bg-green-50">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${getSentimentColor(msg.sentiment_score)} bg-white shadow-sm`}>
                                ⭐ {msg.sentiment_score.toFixed(1)}/10
                              </span>
                              <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-gray-700 mb-3 leading-relaxed">"{msg.text}"</p>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>User: {msg.user_id?.substring(0, 8)}</span>
                              <span>{msg.word_count || msg.text.split(' ').length} words</span>
                            </div>
                            {msg.reactions?.length > 0 && (
                              <div className="mt-3 pt-2 border-t border-green-200">
                                <div className="flex flex-wrap gap-1">
                                  {msg.reactions.map((reaction: any, i: number) => (
                                    <span 
                                      key={i} 
                                      className="text-sm bg-white px-2 py-1 rounded border shadow-sm" 
                                      title={`Sentiment: ${reaction.sentiment_value?.toFixed(1)}`}
                                    >
                                      {reaction.emoji}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Most Negative Messages */}
                  {messageInsights.examples.most_negative?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-red-700 mb-4 flex items-center gap-2">
                        <TrendingDown size={18} />
                        Needs Attention ({messageInsights.examples.most_negative.length})
                      </h4>
                      <div className="space-y-3">
                        {messageInsights.examples.most_negative.map((msg: any, index: number) => (
                          <div key={index} className="p-4 border border-red-200 rounded-lg bg-red-50">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${getSentimentColor(msg.sentiment_score)} bg-white shadow-sm`}>
                                ⚠️ {msg.sentiment_score.toFixed(1)}/10
                              </span>
                              <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-gray-700 mb-3 leading-relaxed">"{msg.text}"</p>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>User: {msg.user_id?.substring(0, 8)}</span>
                              <span>{msg.word_count || msg.text.split(' ').length} words</span>
                            </div>
                            {msg.reactions?.length > 0 && (
                              <div className="mt-3 pt-2 border-t border-red-200">
                                <div className="flex flex-wrap gap-1">
                                  {msg.reactions.map((reaction: any, i: number) => (
                                    <span 
                                      key={i} 
                                      className="text-sm bg-white px-2 py-1 rounded border shadow-sm" 
                                      title={`Sentiment: ${reaction.sentiment_value?.toFixed(1)}`}
                                    >
                                      {reaction.emoji}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Most Reacted Messages */}
                  {messageInsights.examples.most_reactions?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-purple-700 mb-4 flex items-center gap-2">
                        <MessageCircle size={18} />
                        High Engagement ({messageInsights.examples.most_reactions.length})
                      </h4>
                      <div className="space-y-3">
                        {messageInsights.examples.most_reactions.map((msg: any, index: number) => (
                          <div key={index} className="p-4 border border-purple-200 rounded-lg bg-purple-50">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${getSentimentColor(msg.sentiment_score)} bg-white shadow-sm`}>
                                🎯 {msg.sentiment_score.toFixed(1)}/10
                              </span>
                              <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-gray-700 mb-3 leading-relaxed">"{msg.text}"</p>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>User: {msg.user_id?.substring(0, 8)}</span>
                              <span>{msg.reactions?.length || 0} reactions</span>
                            </div>
                            {msg.reactions?.length > 0 && (
                              <div className="mt-3 pt-2 border-t border-purple-200">
                                <div className="flex flex-wrap gap-1">
                                  {msg.reactions.map((reaction: any, i: number) => (
                                    <span 
                                      key={i} 
                                      className="text-sm bg-white px-2 py-1 rounded border shadow-sm" 
                                      title={`Sentiment: ${reaction.sentiment_value?.toFixed(1)}`}
                                    >
                                      {reaction.emoji}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* View Raw Messages Link */}
                <div className="mt-6 pt-4 border-t text-center">
                  <Link
                    href="/messages"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    <Eye size={16} />
                    View All Raw Messages ({messageInsights.summary?.total_messages || 0})
                  </Link>
                </div>
              </div>
            )}
          </>
        )}

        {/* Channel Details Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">Channel Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Channel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Sentiment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Messages
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[...channels]
                  .sort((a, b) => a.avg_sentiment - b.avg_sentiment)
                  .map((channel) => {
                    const alert = getAlertType(channel.avg_sentiment);
                    return (
                      <tr key={channel.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          #{channel.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`font-semibold ${getSentimentColor(channel.avg_sentiment)}`}>
                            {channel.avg_sentiment.toFixed(1)}/10
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {channel.total_messages}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${alert.color}`}>
                            {alert.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">
                          {new Date(channel.last_message).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
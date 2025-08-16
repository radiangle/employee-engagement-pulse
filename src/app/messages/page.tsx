'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageCircle, TrendingUp, TrendingDown, Users, Search, Filter, Eye, ArrowLeft } from 'lucide-react';
import WordCloud from '@/components/WordCloud';

interface Message {
  id: number;
  channel_id: string;
  user_id: string;
  text: string;
  timestamp: string;
  sentiment_score: number;
  sentiment_label: string;
  reactions: { emoji: string; sentiment_value: number }[];
  word_count: number;
  has_reactions: boolean;
}

interface Insight {
  type: string;
  title: string;
  description: string;
  evidence: any[];
  recommendation: string;
}

export default function MessagesAnalysis() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [wordCloudData, setWordCloudData] = useState<{ text: string; value: number }[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [examples, setExamples] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [selectedSentiment, setSelectedSentiment] = useState<string>('all');
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [channels, setChannels] = useState<any[]>([]);

  // Fetch channels for filter
  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const response = await fetch('/api/slack/channels');
      if (response.ok) {
        const data = await response.json();
        setChannels(data.channels || []);
        if (data.channels && data.channels.length > 0) {
          setSelectedChannel(data.channels[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching channels:', error);
    }
  };

  const fetchMessageEvidence = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        days: '7',
      });
      
      if (selectedChannel) params.append('channelId', selectedChannel);
      if (selectedSentiment !== 'all') params.append('sentiment', selectedSentiment);
      
      const response = await fetch(`/api/messages/evidence?${params}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setInsights(data.insights || []);
        setWordCloudData(data.word_cloud_data || []);
        setSummary(data.summary || {});
        setExamples(data.examples || {});
      }
    } catch (error) {
      console.error('Error fetching message evidence:', error);
    }
    setLoading(false);
  };

  // Fetch data when filters change
  useEffect(() => {
    if (selectedChannel) {
      fetchMessageEvidence();
    }
  }, [selectedChannel, selectedSentiment]);

  const getSentimentColor = (score: number) => {
    if (score >= 7) return 'text-green-600 bg-green-100';
    if (score >= 4) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getSentimentIcon = (label: string) => {
    if (label === 'positive') return <TrendingUp size={16} className="text-green-600" />;
    if (label === 'negative') return <TrendingDown size={16} className="text-red-600" />;
    return <div className="w-4 h-4 bg-yellow-400 rounded-full" />;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'concern': return '🚨';
      case 'warning': return '⚠️';
      case 'positive': return '✅';
      case 'engagement': return '💬';
      default: return '💡';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <ArrowLeft size={20} />
                  Back to Dashboard
                </Link>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <MessageCircle className="text-blue-600" />
                Message Analysis & Evidence
              </h1>
              <p className="text-gray-600 mt-1">Detailed message examination with supporting evidence for insights</p>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex gap-4 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Channel</label>
              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    #{channel.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sentiment Filter</label>
              <select
                value={selectedSentiment}
                onChange={(e) => setSelectedSentiment(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Messages</option>
                <option value="positive">Positive Only</option>
                <option value="negative">Negative Only</option>
                <option value="neutral">Neutral Only</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Messages</p>
                    <p className="text-2xl font-bold text-gray-900">{summary.total_messages || 0}</p>
                  </div>
                  <MessageCircle className="text-blue-600" size={24} />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Sentiment</p>
                    <p className="text-2xl font-bold text-gray-900">{summary.avg_sentiment || '0'}/10</p>
                  </div>
                  <TrendingUp className="text-green-600" size={24} />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">With Reactions</p>
                    <p className="text-2xl font-bold text-gray-900">{summary.messages_with_reactions || 0}</p>
                  </div>
                  <div className="text-yellow-500 text-xl">👍</div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Words</p>
                    <p className="text-2xl font-bold text-gray-900">{summary.avg_word_count || 0}</p>
                  </div>
                  <div className="text-gray-600">📝</div>
                </div>
              </div>
            </div>

            {/* Word Cloud */}
            {wordCloudData.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  🏷️ Most Frequent Words
                  <span className="text-sm text-gray-500">({wordCloudData.length} unique words)</span>
                </h3>
                <WordCloud data={wordCloudData} width={800} height={400} />
              </div>
            )}

            {/* AI-Generated Insights */}
            {insights.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  💡 Evidence-Based Insights
                </h3>
                <div className="space-y-4">
                  {insights.map((insight, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{getInsightIcon(insight.type)}</span>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                          <p className="text-gray-700 mb-2">{insight.description}</p>
                          <p className="text-sm text-blue-700 italic">💡 {insight.recommendation}</p>
                          
                          {/* Evidence */}
                          {insight.evidence && insight.evidence.length > 0 && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-600 mb-2">Supporting Evidence:</p>
                              <div className="space-y-2">
                                {insight.evidence.slice(0, 2).map((evidence: any, i: number) => (
                                  <div key={i} className="text-sm">
                                    {evidence.text ? (
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono bg-gray-200 px-2 py-1 rounded">
                                          "{evidence.text}"
                                        </span>
                                        <span className="text-gray-500">({evidence.value} times)</span>
                                      </div>
                                    ) : (
                                      <div className="p-2 bg-white border rounded">
                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs ${getSentimentColor(evidence.sentiment_score)}`}>
                                          {evidence.sentiment_score?.toFixed(1) || 'N/A'}
                                        </span>
                                        <span className="ml-2">{evidence.text?.substring(0, 80) || 'No text'}...</span>
                                      </div>
                                    )}
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

            {/* Example Messages */}
            {(examples.most_positive?.length > 0 || examples.most_negative?.length > 0) && (
              <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
                <h3 className="text-lg font-semibold mb-4">📋 Message Examples</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Most Positive */}
                  {examples.most_positive?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-green-700 mb-3 flex items-center gap-2">
                        <TrendingUp size={16} />
                        Most Positive Messages
                      </h4>
                      <div className="space-y-3">
                        {examples.most_positive.slice(0, 3).map((msg: Message, index: number) => (
                          <div key={index} className="p-3 border border-green-200 rounded-lg bg-green-50">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(msg.sentiment_score)}`}>
                                {msg.sentiment_score.toFixed(1)}
                              </span>
                              <span className="text-xs text-gray-500">{formatTimestamp(msg.timestamp)}</span>
                            </div>
                            <p className="text-sm text-gray-700">"{msg.text}"</p>
                            {msg.reactions.length > 0 && (
                              <div className="mt-2 flex gap-1">
                                {msg.reactions.map((reaction, i) => (
                                  <span key={i} className="text-sm" title={`Sentiment: ${reaction.sentiment_value}`}>
                                    {reaction.emoji}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Most Negative */}
                  {examples.most_negative?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-red-700 mb-3 flex items-center gap-2">
                        <TrendingDown size={16} />
                        Most Negative Messages
                      </h4>
                      <div className="space-y-3">
                        {examples.most_negative.slice(0, 3).map((msg: Message, index: number) => (
                          <div key={index} className="p-3 border border-red-200 rounded-lg bg-red-50">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(msg.sentiment_score)}`}>
                                {msg.sentiment_score.toFixed(1)}
                              </span>
                              <span className="text-xs text-gray-500">{formatTimestamp(msg.timestamp)}</span>
                            </div>
                            <p className="text-sm text-gray-700">"{msg.text}"</p>
                            {msg.reactions.length > 0 && (
                              <div className="mt-2 flex gap-1">
                                {msg.reactions.map((reaction, i) => (
                                  <span key={i} className="text-sm" title={`Sentiment: ${reaction.sentiment_value}`}>
                                    {reaction.emoji}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* All Messages */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                📝 All Messages ({messages.length})
              </h3>
              
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No messages found matching the current filters.</p>
                  <p className="text-sm">Try adjusting the channel or sentiment filter.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {getSentimentIcon(message.sentiment_label)}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(message.sentiment_score)}`}>
                            {message.sentiment_score.toFixed(1)}
                          </span>
                          <span className="text-sm text-gray-500">
                            User: {message.user_id.substring(0, 8)}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">{formatTimestamp(message.timestamp)}</span>
                      </div>
                      
                      <p className="text-gray-700 mb-3">"{message.text}"</p>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-4">
                          <span>{message.word_count} words</span>
                          {message.reactions.length > 0 && (
                            <div className="flex items-center gap-1">
                              <span>Reactions:</span>
                              {message.reactions.map((reaction, i) => (
                                <span key={i} title={`Sentiment: ${reaction.sentiment_value.toFixed(1)}`}>
                                  {reaction.emoji}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
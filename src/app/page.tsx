'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BarChart3, MessageSquare, TrendingUp, AlertCircle, Play, CheckCircle } from 'lucide-react';

export default function Home() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

  const steps = [
    'Connect to Slack',
    'Select Channels',
    'Collect Messages', 
    'Analyze Sentiment',
    'View Dashboard'
  ];

  const handleConnectSlack = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/slack/channels');
      const data = await response.json();
      
      if (data.success || (data.channels && data.channels.length > 0)) {
        setChannels(data.channels || []);
        setStep(1);
      } else {
        alert(`Error: ${data.error || data.message || 'Failed to connect'}`);
      }
    } catch (error) {
      alert('Failed to connect to Slack');
    }
    setLoading(false);
  };

  const handleCollectMessages = async () => {
    setLoading(true);
    for (const channelId of selectedChannels) {
      try {
        await fetch('/api/slack/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelId, days: 7 }),
        });
      } catch (error) {
        console.error(`Failed to collect messages for ${channelId}`);
      }
    }
    setStep(3);
    setLoading(false);
  };

  const handleAnalyzeSentiment = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sentiment/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reanalyze: true }),
      });
      
      if (response.ok) {
        setStep(4);
      } else {
        const error = await response.json();
        alert(`Sentiment analysis failed: ${error.error}`);
      }
    } catch (error) {
      alert('Failed to analyze sentiment');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-blue-600" size={32} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Slack Sentiment Dashboard</h1>
              <p className="text-gray-600">Monitor team engagement and sentiment in real-time</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-center space-x-8">
            {steps.map((stepName, index) => (
              <div key={index} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                  ${index <= step 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                  }`}>
                  {index < step ? <CheckCircle size={16} /> : index + 1}
                </div>
                <div className={`ml-3 text-sm font-medium 
                  ${index <= step ? 'text-blue-600' : 'text-gray-400'}
                `}>
                  {stepName}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 ml-8 
                    ${index < step ? 'bg-blue-600' : 'bg-gray-200'}
                  `} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {step === 0 && (
            <div className="text-center">
              <MessageSquare className="mx-auto mb-6 text-blue-600" size={64} />
              <h2 className="text-2xl font-bold mb-4">Connect to Slack Workspace</h2>
              <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                Connect to your Slack workspace to start analyzing team sentiment. 
                Make sure your bot token is configured and the bot has been added to the channels you want to monitor.
              </p>
              <button
                onClick={handleConnectSlack}
                disabled={loading}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
              >
                {loading ? (
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Play size={20} />
                )}
                {loading ? 'Connecting...' : 'Connect to Slack'}
              </button>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Select Channels to Monitor</h2>
              <p className="text-gray-600 mb-6">
                Choose which channels you want to include in sentiment analysis:
              </p>
              
              {channels.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto mb-4 text-yellow-500" size={48} />
                  <p className="text-gray-600">
                    No accessible channels found. Make sure the bot has been added to channels.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 mb-8">
                  {channels.map((channel) => (
                    <label key={channel.id} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selectedChannels.includes(channel.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedChannels([...selectedChannels, channel.id]);
                          } else {
                            setSelectedChannels(selectedChannels.filter(id => id !== channel.id));
                          }
                        }}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium">#{channel.name}</div>
                        <div className="text-sm text-gray-500">
                          {channel.member_count} members
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(0)}
                  className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={selectedChannels.length === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Continue ({selectedChannels.length} selected)
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="text-center">
              <MessageSquare className="mx-auto mb-6 text-blue-600" size={64} />
              <h2 className="text-2xl font-bold mb-4">Collect Messages</h2>
              <p className="text-gray-600 mb-8">
                Collect messages from selected channels (last 7 days)
              </p>
              <button
                onClick={handleCollectMessages}
                disabled={loading}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
              >
                {loading ? (
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Play size={20} />
                )}
                {loading ? 'Collecting...' : 'Collect Messages'}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="text-center">
              <TrendingUp className="mx-auto mb-6 text-blue-600" size={64} />
              <h2 className="text-2xl font-bold mb-4">Analyze Sentiment</h2>
              <p className="text-gray-600 mb-8">
                Run AI sentiment analysis on collected messages
              </p>
              <button
                onClick={handleAnalyzeSentiment}
                disabled={loading}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
              >
                {loading ? (
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Play size={20} />
                )}
                {loading ? 'Analyzing...' : 'Analyze Sentiment'}
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="text-center">
              <CheckCircle className="mx-auto mb-6 text-green-600" size={64} />
              <h2 className="text-2xl font-bold mb-4">Setup Complete!</h2>
              <p className="text-gray-600 mb-8">
                Your sentiment analysis is ready. View the dashboard to monitor team engagement.
              </p>
              <Link
                href="/dashboard"
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
              >
                <BarChart3 size={20} />
                View Dashboard
              </Link>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <BarChart3 className="mx-auto mb-4 text-blue-600" size={48} />
            <h3 className="text-lg font-semibold mb-2">Real-time Analytics</h3>
            <p className="text-gray-600">
              Monitor sentiment trends across channels with interactive charts
            </p>
          </div>
          <div className="text-center">
            <AlertCircle className="mx-auto mb-4 text-yellow-500" size={48} />
            <h3 className="text-lg font-semibold mb-2">Smart Alerts</h3>
            <p className="text-gray-600">
              Get notified when sentiment drops below thresholds
            </p>
          </div>
          <div className="text-center">
            <TrendingUp className="mx-auto mb-4 text-green-500" size={48} />
            <h3 className="text-lg font-semibold mb-2">Actionable Insights</h3>
            <p className="text-gray-600">
              Export data and get recommendations for team improvement
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

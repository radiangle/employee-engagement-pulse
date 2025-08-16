'use client';

import React from 'react';
import { TagCloud } from 'react-tagcloud';

interface WordCloudProps {
  data: { text: string; value: number }[];
  width?: number;
  height?: number;
}

export default function WordCloud({ data, width = 600, height = 400 }: WordCloudProps) {
  if (data.length === 0) {
    return (
      <div 
        className="relative border rounded-lg bg-gray-50 overflow-hidden flex items-center justify-center"
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        <p className="text-gray-500">No word data available</p>
      </div>
    );
  }

  // Transform data for react-tagcloud format
  const cloudData = data.map(item => ({
    value: item.text,
    count: item.value,
  }));

  const customRenderer = (tag: any, size: number, color: string) => (
    <span
      key={tag.value}
      style={{
        fontSize: `${size}px`,
        color: color,
        margin: '3px',
        padding: '3px 6px',
        borderRadius: '4px',
        backgroundColor: `${color}15`,
        display: 'inline-block',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      className="hover:scale-110 font-medium"
      title={`"${tag.value}" appears ${tag.count} times`}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = `${color}25`;
        e.currentTarget.style.transform = 'scale(1.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = `${color}15`;
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {tag.value}
    </span>
  );

  const colorOptions = {
    luminosity: 'bright',
    format: 'hex',
    hue: 'blue'
  };

  return (
    <div 
      className="relative border rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden p-4"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <TagCloud
        minSize={12}
        maxSize={42}
        tags={cloudData}
        colorOptions={colorOptions}
        renderer={customRenderer}
        shuffle={false}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '20px',
        }}
      />
      
      {/* Enhanced Legend */}
      <div className="absolute bottom-3 right-3 text-xs text-gray-700">
        <div className="bg-white bg-opacity-90 p-3 rounded-lg shadow-sm border">
          <div className="font-semibold mb-2">Word Frequency</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded"></div>
              <span>High (42px)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-400 rounded"></div>
              <span>Medium (28px)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-300 rounded"></div>
              <span>Low (12px)</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Hover for details
          </div>
        </div>
      </div>
    </div>
  );
}
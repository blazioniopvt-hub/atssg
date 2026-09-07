'use client';

import React from 'react';
import { GapItem, Skill } from '@/lib/api';
import { Badge } from '@skillsync/ui';
import { Card, CardContent } from '@skillsync/ui/components/Card';

interface GapItemProps {
  item: GapItem;
  index: number;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  KNOWN: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  PARTIAL: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  MISSING: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  FOUNDATION_REQUIRED: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  KNOWN: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  ),
  PARTIAL: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  MISSING: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  ),
  FOUNDATION_REQUIRED: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
};

export function GapItemComponent({ item, index }: GapItemProps) {
  const colors = STATUS_COLORS[item.status];
  const icon = STATUS_ICONS[item.status];

  return (
    <Card className={`border-l-4 ${colors.border}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colors.bg} ${colors.text}`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{item.skill.name}</span>
                <Badge variant="outline" className="text-xs capitalize">
                  {item.status.replace('_', ' ')}
                </Badge>
              </div>
              <span className="text-xs text-gray-500">#{index + 1}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">{item.skill.category}</p>
            
            {(item.userProficiencyLevel || item.status === 'MISSING' || item.status === 'FOUNDATION_REQUIRED') && (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                {item.userProficiencyLevel && (
                  <span className="px-2 py-1 bg-gray-100 rounded text-gray-700">
                    Your level: <span className="font-medium">{item.userProficiencyLevel}</span>
                  </span>
                )}
                {item.targetProficiency && (
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">
                    Required: <span className="font-medium">{item.targetProficiency}</span>
                  </span>
                )}
                {item.proficiencyGap && item.proficiencyGap > 0 && (
                  <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded">
                    Gap: {item.proficiencyGap} level{item.proficiencyGap > 1 ? 's' : ''}
                  </span>
                )}
                {item.confidenceContext && (
                  <span className={`px-2 py-1 rounded ${
                    item.confidenceContext === 'HIGH' ? 'bg-emerald-50 text-emerald-700' :
                    item.confidenceContext === 'MEDIUM' ? 'bg-yellow-50 text-yellow-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    Confidence: {item.confidenceContext}
                  </span>
                )}
              </div>
            )}
            
            {item.priorityReason && (
              <p className="mt-2 text-xs text-gray-500 italic">{item.priorityReason}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
'use client';

import React from 'react';
import { LearningMilestone, Skill } from '@/lib/api';
import { Badge } from '@skillsync/ui';
import { Card, CardContent } from '@skillsync/ui/components/Card';

interface LearningMilestoneProps {
  milestone: LearningMilestone;
  onClick?: () => void;
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

const DIFFICULTY_COLORS: Record<string, string> = {
  LOW: 'bg-emerald-100 text-emerald-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-red-100 text-red-700',
};

export function LearningMilestoneComponent({ milestone, onClick }: LearningMilestoneProps) {
  const colors = STATUS_COLORS[milestone.status];
  const icon = STATUS_ICONS[milestone.status];
  const difficultyColor = DIFFICULTY_COLORS[milestone.estimatedDifficulty] || 'bg-gray-100 text-gray-700';

  return (
    <Card 
      className={`border-l-4 ${colors.border} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${colors.bg} ${colors.text} text-lg font-bold`}>
              {milestone.order}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colors.bg} ${colors.text}`}>
                  {icon}
                </div>
                <div className="min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">{milestone.skill.name}</h4>
                  <p className="text-sm text-gray-500 truncate">{milestone.skill.category}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="outline" className={difficultyColor}>
                  {milestone.estimatedDifficulty}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {milestone.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
            
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              {milestone.currentProficiency && (
                <span className="px-2 py-1 bg-gray-100 rounded text-gray-700">
                  Current: <span className="font-medium">{milestone.currentProficiency}</span>
                </span>
              )}
              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">
                Target: <span className="font-medium">{milestone.targetProficiency}</span>
              </span>
            </div>

            {milestone.prerequisiteSkills.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-1">Prerequisites:</p>
                <div className="flex flex-wrap gap-1">
                  {milestone.prerequisiteSkills.slice(0, 3).map((prereq) => (
                    <Badge key={prereq.id} variant="outline" className="text-xs">
                      {prereq.name}
                    </Badge>
                  ))}
                  {milestone.prerequisiteSkills.length > 3 && (
                    <Badge variant="outline" className="text-xs text-gray-500">
                      +{milestone.prerequisiteSkills.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {milestone.priorityReason && (
              <p className="mt-2 text-xs text-gray-500 italic">{milestone.priorityReason}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
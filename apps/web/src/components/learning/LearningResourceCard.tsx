'use client';

import React from 'react';
import { LearningResourceSummary } from '@/lib/api';
import { Badge } from '@skillsync/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@skillsync/ui/components/Card';
import { Button } from '@skillsync/ui';

const TYPE_LABELS: Record<string, string> = {
  COURSE: 'Course',
  BOOK: 'Book',
  VIDEO: 'Video',
  DOCUMENTATION: 'Documentation',
  ARTICLE: 'Article',
  PROJECT: 'Project',
  TUTORIAL: 'Tutorial',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  BEGINNER: 'bg-emerald-100 text-emerald-700',
  INTERMEDIATE: 'bg-yellow-100 text-yellow-700',
  ADVANCED: 'bg-orange-100 text-orange-700',
  EXPERT: 'bg-red-100 text-red-700',
};

interface LearningResourceCardProps {
  resource: LearningResourceSummary;
  onClick?: () => void;
}

export function LearningResourceCard({ resource, onClick }: LearningResourceCardProps) {
  const typeLabel = TYPE_LABELS[resource.type] || resource.type;
  const difficultyColor = resource.difficulty ? DIFFICULTY_COLORS[resource.difficulty] : 'bg-gray-100 text-gray-700';

  return (
    <Card className={`h-full ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`} onClick={onClick}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2">{resource.title}</CardTitle>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="outline" className="capitalize">{typeLabel.toLowerCase()}</Badge>
              {resource.difficulty && (
                <Badge variant="outline" className={difficultyColor}>
                  {resource.difficulty}
                </Badge>
              )}
              {resource.verifiedSource && (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  Verified
                </Badge>
              )}
              {resource.provider && (
                <span className="text-xs text-gray-500 px-2 py-1 bg-gray-50 rounded">{resource.provider}</span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {resource.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-3">{resource.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          {resource.durationMinutes && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {Math.round(resource.durationMinutes / 60)}h {resource.durationMinutes % 60}m
            </span>
          )}
          {resource.rating && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {resource.rating.toFixed(1)}
            </span>
          )}
          {resource.language && (
            <span className="px-2 py-1 bg-gray-100 rounded">{resource.language.toUpperCase()}</span>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              window.open(resource.url, '_blank', 'noopener,noreferrer');
            }}
          >
            View Resource
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
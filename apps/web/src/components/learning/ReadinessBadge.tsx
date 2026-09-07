'use client';

import React from 'react';
import { Badge } from '@skillsync/ui';

interface ReadinessBadgeProps {
  readiness: 'READY' | 'PARTIAL' | 'FOUNDATION_REQUIRED';
  size?: 'sm' | 'md' | 'lg';
}

const READINESS_CONFIG: Record<string, { label: string; description: string; color: string; icon: React.ReactNode }> = {
  READY: {
    label: 'Ready',
    description: 'You meet all prerequisites for this skill',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    ),
  },
  PARTIAL: {
    label: 'Partial',
    description: 'You have some prerequisites but gaps remain',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
  },
  FOUNDATION_REQUIRED: {
    label: 'Foundation Required',
    description: 'Core foundational skills are missing or insufficient',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
  },
};

const SIZE_CLASSES: Record<string, string> = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
};

export function ReadinessBadge({ readiness, size = 'md' }: ReadinessBadgeProps) {
  const config = READINESS_CONFIG[readiness];
  const sizeClass = SIZE_CLASSES[size];

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={`${config.color} ${sizeClass} flex items-center gap-1.5`}>
        {config.icon}
        <span>{config.label}</span>
      </Badge>
      <span className="text-gray-600 text-sm">{config.description}</span>
    </div>
  );
}
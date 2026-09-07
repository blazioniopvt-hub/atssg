'use client';

import React from 'react';
import { Badge } from '@skillsync/ui';

interface ConfidenceBadgeProps {
  level: string;
  score: number;
}

const CONFIDENCE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  VERY_HIGH: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
  HIGH: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  MEDIUM: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  LOW: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  VERY_LOW: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
  DEFAULT: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
};

export function ConfidenceBadge({ level, score }: ConfidenceBadgeProps) {
  const colors = CONFIDENCE_COLORS[level] || CONFIDENCE_COLORS.DEFAULT;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} ${colors.border} border`}>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
      </span>
      <span>{level.replace('_', ' ')}</span>
      <span className="px-1.5 py-0.5 text-xs font-mono bg-white/50 rounded">{Math.round(score * 100)}%</span>
    </span>
  );
}

interface ProficiencyBadgeProps {
  level: string;
}

const PROFICIENCY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  EXPERT: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  ADVANCED: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  INTERMEDIATE: { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-200' },
  BEGINNER: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
};

export function ProficiencyBadge({ level }: ProficiencyBadgeProps) {
  const colors = PROFICIENCY_COLORS[level] || PROFICIENCY_COLORS.BEGINNER;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} ${colors.border} border`}>
      {level}
    </span>
  );
}

interface EvidenceTypeBadgeProps {
  type: string;
}

const EVIDENCE_TYPE_COLORS: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  PROJECT: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200', icon: <span className="text-indigo-600">📁</span> },
  CERTIFICATE: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', icon: <span className="text-amber-600">📜</span> },
  PORTFOLIO_ITEM: { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200', icon: <span className="text-pink-600">🖼️</span> },
  EXPERIENCE: { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200', icon: <span className="text-teal-600">💼</span> },
  ASSESSMENT_RESULT: { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-200', icon: <span className="text-violet-600">📝</span> },
  SELF_REPORTED: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200', icon: <span className="text-gray-600">👤</span> },
  OTHER: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200', icon: <span className="text-slate-600">📄</span> },
};

export function EvidenceTypeBadge({ type }: EvidenceTypeBadgeProps) {
  const colors = EVIDENCE_TYPE_COLORS[type] || EVIDENCE_TYPE_COLORS.OTHER;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} ${colors.border} border`}>
      {colors.icon}
      <span>{type.replace('_', ' ')}</span>
    </span>
  );
}

export function VerificationStatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    VERIFIED: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
    PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
    UNVERIFIED: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
  };

  const color = colors[status] || colors.UNVERIFIED;

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${color.bg} ${color.text} ${color.border} border`}>
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
      </span>
      <span className="ml-1">{status}</span>
    </span>
  );
}
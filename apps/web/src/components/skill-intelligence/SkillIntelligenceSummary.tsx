'use client';

import React from 'react';
import { SkillIntelligenceSummary } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@skillsync/ui/components/Card';
import { ConfidenceBadge, ProficiencyBadge } from './Badges';

interface SkillIntelligenceSummaryProps {
  summary: SkillIntelligenceSummary;
  className?: string;
}

export function SkillIntelligenceSummaryComponent({ summary, className }: SkillIntelligenceSummaryProps) {
  if (!summary || summary.totalSkills === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <div className="text-gray-500">
            <p className="text-lg font-medium mb-2">No skills added yet</p>
            <p className="text-sm">Add skills to your profile to see your skill intelligence</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Skill Intelligence Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Skills"
            value={summary.totalSkills}
            icon="🧠"
          />
          <StatCard
            label="Avg Confidence"
            value={`${Math.round(summary.averageConfidence * 100)}%`}
            icon="📊"
          />
          <StatCard
            label="Top Proficiency"
            value={
              Object.entries(summary.skillsByProficiency).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
            }
            icon="⭐"
          />
          <StatCard
            label="High Confidence"
            value={
              summary.skillsByConfidence.HIGH +
              summary.skillsByConfidence.VERY_HIGH +
              (summary.skillsByConfidence.VERY_HIGH || 0)
            }
            icon="🎯"
          />
        </div>

        {/* Proficiency Distribution */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Proficiency Distribution</h4>
          <div className="space-y-2">
            {(['EXPERT', 'ADVANCED', 'INTERMEDIATE', 'BEGINNER'] as const).map((level) => {
              const count = summary.skillsByProficiency[level] || 0;
              const percentage = summary.totalSkills > 0 ? (count / summary.totalSkills) * 100 : 0;
              return (
                <ProficiencyBar key={level} level={level} count={count} percentage={percentage} />
              );
            })}
          </div>
        </div>

        {/* Confidence Distribution */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Confidence Levels</h4>
          <div className="space-y-2">
            {(['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW', 'VERY_LOW'] as const).map((level) => {
              const count = summary.skillsByConfidence[level] || 0;
              const percentage = summary.totalSkills > 0 ? (count / summary.totalSkills) * 100 : 0;
              return (
                <ConfidenceBar key={level} level={level} count={count} percentage={percentage} />
              );
            })}
          </div>
        </div>

        {/* Top Skills */}
        {summary.topSkills.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Top Skills by Confidence</h4>
            <div className="space-y-2">
              {summary.topSkills.slice(0, 5).map((skill) => (
                <div
                  key={skill.skill.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{skill.skill.name}</span>
                    <ProficiencyBadge level={skill.userSkill.proficiencyLevel} />
                  </div>
                  <ConfidenceBadge level={skill.intelligence.level} score={skill.intelligence.score} />
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

interface ProficiencyBarProps {
  level: string;
  count: number;
  percentage: number;
}

const PROFICIENCY_COLORS: Record<string, string> = {
  EXPERT: 'bg-purple-500',
  ADVANCED: 'bg-blue-500',
  INTERMEDIATE: 'bg-cyan-500',
  BEGINNER: 'bg-gray-400',
};

function ProficiencyBar({ level, count, percentage }: ProficiencyBarProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-xs font-medium text-gray-600 capitalize">{level.toLowerCase()}</span>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${PROFICIENCY_COLORS[level]} rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-16 text-xs text-gray-500 text-right">{count} ({percentage.toFixed(0)}%)</span>
    </div>
  );
}

interface ConfidenceBarProps {
  level: string;
  count: number;
  percentage: number;
}

const CONFIDENCE_COLORS: Record<string, string> = {
  VERY_HIGH: 'bg-emerald-500',
  HIGH: 'bg-green-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-orange-500',
  VERY_LOW: 'bg-red-500',
};

function ConfidenceBar({ level, count, percentage }: ConfidenceBarProps) {
  const displayLevel = level.replace('_', ' ');
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-xs font-medium text-gray-600">{displayLevel}</span>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${CONFIDENCE_COLORS[level]} rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-16 text-xs text-gray-500 text-right">{count} ({percentage.toFixed(0)}%)</span>
    </div>
  );
}
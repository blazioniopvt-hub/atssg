'use client';

import React from 'react';
import { SkillIntelligenceItem } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@skillsync/ui/components/Card';
import { ConfidenceBadge, ProficiencyBadge, EvidenceTypeBadge, VerificationStatusBadge } from './Badges';

interface SkillIntelligenceCardProps {
  item: SkillIntelligenceItem;
  onClick?: () => void;
  showEvidence?: boolean;
  className?: string;
}

export function SkillIntelligenceCard({
  item,
  onClick,
  showEvidence = true,
  className,
}: SkillIntelligenceCardProps) {
  return (
    <Card
      className={`transition-all hover:shadow-md ${onClick ? 'cursor-pointer' : ''} ${className || ''}`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg font-semibold truncate">{item.skill.name}</CardTitle>
              <ProficiencyBadge level={item.userSkill.proficiencyLevel} />
              <VerificationStatusBadge status={item.userSkill.verificationStatus} />
            </div>
            <p className="mt-1 text-sm text-gray-500 capitalize">{item.skill.category.toLowerCase().replace('_', ' ')}</p>
          </div>
          <ConfidenceBadge level={item.intelligence.level} score={item.intelligence.score} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{item.intelligence.evidenceCount}</p>
            <p className="text-xs text-gray-500">Evidence Items</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{Math.round(item.intelligence.score * 100)}%</p>
            <p className="text-xs text-gray-500">Confidence</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{item.userSkill.yearsOfExperience ?? 0}</p>
            <p className="text-xs text-gray-500">Years Exp.</p>
          </div>
        </div>

        {showEvidence && item.evidenceTypes.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Evidence Types</p>
            <div className="flex flex-wrap gap-2">
              {item.evidenceTypes.map((type) => (
                <EvidenceTypeBadge key={type} type={type} />
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Baseline: {Math.round(item.intelligence.factors.proficiencyBaseline * 100)}%</span>
            <span>Self-reported: {Math.round(item.intelligence.factors.selfReported * 100)}%</span>
            <span>Evidence weight: {Math.round(item.intelligence.factors.totalWeight * 100)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
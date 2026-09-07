// Confidence Calculation Service
// Deterministic confidence scoring based on evidence

import {
  getEvidenceWeight,
  getProficiencyBaseline,
  getConfidenceLevel,
  clamp,
  MAX_CONFIDENCE,
  MIN_CONFIDENCE,
} from './config';

export interface EvidenceItem {
  type: string;
  verifiedAt: Date | null;
  verificationStatus: string;
}

export interface ProficiencyLevel {
  level: string;
}

export interface ConfidenceFactors {
  selfReported: number;
  evidence: Array<{
    type: string;
    weight: number;
    verified: boolean;
  }>;
  proficiencyBaseline: number;
  totalWeight: number;
  evidenceCount: number;
}

export interface ConfidenceResult {
  score: number;
  level: string;
  evidenceCount: number;
  factors: ConfidenceFactors;
}

export class ConfidenceService {
  calculate(
    proficiencyLevel: string,
    evidenceItems: EvidenceItem[],
    hasSelfReported: boolean = true
  ): ConfidenceResult {
    const proficiencyBaseline = getProficiencyBaseline(proficiencyLevel);
    const selfReportedWeight = hasSelfReported ? getEvidenceWeight('SELF_REPORTED') : 0;

    // Process evidence items
    const processedEvidence = evidenceItems
      .filter((item) => {
        // Only count verified or self-reported evidence
        return item.verificationStatus === 'VERIFIED' || item.verificationStatus === 'UNVERIFIED';
      })
      .map((item) => ({
        type: item.type,
        weight: getEvidenceWeight(item.type),
        verified: item.verificationStatus === 'VERIFIED',
        verifiedAt: item.verifiedAt,
      }));

    // Calculate total evidence weight
    let totalWeight = 0;
    const evidenceDetails = processedEvidence.map((item) => {
      let weight = item.weight;
      // Apply verification bonus
      if (item.verified) {
        weight *= 1.2;
      }
      totalWeight += weight;
      return item;
    });

    // Apply diminishing returns for multiple evidence items of same type
    const typeCounts: Record<string, number> = {};
    const adjustedEvidence = processedEvidence.map((item) => {
      const count = typeCounts[item.type] || 0;
      typeCounts[item.type] = count + 1;
      // Diminishing returns: each additional item of same type has 80% effectiveness
      const multiplier = Math.pow(0.8, count);
      return {
        ...item,
        weight: item.weight * multiplier,
      };
    });

    // Recalculate total with diminishing returns
    const adjustedTotalWeight = adjustedEvidence.reduce((sum, item) => sum + item.weight, 0);

    // Self-reported baseline
    let confidence = hasSelfReported ? selfReportedWeight : 0;

    // Add evidence weight (capped)
    const evidenceContribution = Math.min(adjustedTotalWeight, 0.7);
    confidence += evidenceContribution;

    // Add proficiency baseline influence (weighted by evidence)
    const evidenceFactor = Math.min(adjustedTotalWeight / 0.5, 1);
    confidence += proficiencyBaseline * evidenceFactor * 0.3;

    // Apply recency factor for evidence
    const now = new Date();
    const recentEvidence = processedEvidence.filter((item) => {
      if (!item.verifiedAt) return false;
      const daysSince = (now.getTime() - item.verifiedAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince < 365;
    });
    if (recentEvidence.length > 0) {
      confidence += 0.05 * Math.min(recentEvidence.length, 3);
    }

    // Clamp to valid range
    confidence = clamp(confidence, MIN_CONFIDENCE, MAX_CONFIDENCE);

    // Prepare factors for transparency
    const factors: ConfidenceFactors = {
      selfReported: hasSelfReported ? selfReportedWeight : 0,
      evidence: adjustedEvidence.map((item) => ({
        type: item.type,
        weight: item.weight,
        verified: item.verified,
      })),
      proficiencyBaseline,
      totalWeight: adjustedTotalWeight,
      evidenceCount: processedEvidence.length,
    };

    return {
      score: Math.round(confidence * 100) / 100,
      level: getConfidenceLevel(confidence),
      evidenceCount: processedEvidence.length,
      factors,
    };
  }
}

export const confidenceService = new ConfidenceService();
export { skillConfidenceService, SkillConfidenceService } from './skill-confidence';
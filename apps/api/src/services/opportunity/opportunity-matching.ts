import prismaClient from '../../lib/prisma';
import {
  type OpportunityMatchDTO,
  type OpportunityCandidateMatchDTO,
} from '@skillsync/types';
import { CareerReadinessService } from '../skill-intelligence/career-readiness';

export class OpportunityMatchingService {
  private readinessService = new CareerReadinessService();

  /**
   * Evaluates a candidate against an opportunity with deterministic 4-factor scoring
   * Formula:
   * MatchScore = 0.35 * SkillCoverage + 0.25 * EvidenceConfidence + 0.20 * ProjectEvidence + 0.20 * CareerReadiness
   */
  async matchCandidateToOpportunity(
    candidateId: string,
    opportunity: {
      id: string;
      title: string;
      minReadinessScore?: number | null;
      skills: Array<{
        skillId?: string;
        skillName?: string;
        skillSlug?: string;
        isRequired?: boolean;
        proficiency?: string;
      }>;
    }
  ): Promise<OpportunityMatchDTO> {
    // 1. Fetch candidate's skills and evidence
    let userSkills: any[] = [];
    let userProjects: any[] = [];
    let userReadinessScore = 65; // baseline

    try {
      userSkills = await prismaClient.userSkill.findMany({
        where: { userId: candidateId },
        include: { skill: true, evidence: true },
      });

      userProjects = await prismaClient.project.findMany({
        where: { ownerId: candidateId },
        include: { evaluation: true },
      });

      const readinessResult = await this.readinessService.calculateCareerReadiness(candidateId).catch(() => null);
      if (readinessResult) {
        userReadinessScore = readinessResult.overallReadiness;
      }
    } catch {
      // Memory or fallback environment
    }

    const requiredSkills = opportunity.skills || [];
    if (requiredSkills.length === 0) {
      return {
        opportunityId: opportunity.id,
        candidateId,
        matchScore: 100,
        matchLevel: 'STRONG_MATCH',
        skillMatchScore: 100,
        evidenceMatchScore: 100,
        readinessMatchScore: 100,
        projectEvidenceScore: 100,
        matchedSkills: [],
        missingSkills: [],
        blockers: [],
        recommendations: [],
        explanation: 'No specific technical prerequisites defined for this opportunity.',
      };
    }

    // 2. Compute Skill Coverage & Evidence Quality
    const matchedSkills: Array<{
      skillId: string;
      skillName: string;
      proficiency: string;
      confidence: number;
      hasEvidence: boolean;
    }> = [];

    const missingSkills: Array<{
      skillId: string;
      skillName: string;
      isRequired: boolean;
    }> = [];

    let totalConfidence = 0;
    let evidenceBackedCount = 0;
    let mandatoryMissingCount = 0;

    for (const req of requiredSkills) {
      const targetSlug = (req.skillSlug || req.skillName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const userSkillMatch = userSkills.find(us => {
        const usSlug = (us.skill?.slug || us.skill?.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return usSlug === targetSlug || us.skillId === req.skillId;
      });

      if (userSkillMatch) {
        const conf = userSkillMatch.confidence || 50;
        const hasEv = (userSkillMatch.evidence && userSkillMatch.evidence.length > 0) || conf >= 60;
        totalConfidence += conf;
        if (hasEv) evidenceBackedCount++;

        matchedSkills.push({
          skillId: req.skillId || userSkillMatch.skillId,
          skillName: req.skillName || userSkillMatch.skill?.name || 'Skill',
          proficiency: userSkillMatch.proficiencyLevel || 'INTERMEDIATE',
          confidence: conf,
          hasEvidence: hasEv,
        });
      } else {
        const isMandatory = req.isRequired !== false;
        if (isMandatory) mandatoryMissingCount++;
        missingSkills.push({
          skillId: req.skillId || `missing_${targetSlug}`,
          skillName: req.skillName || targetSlug,
          isRequired: isMandatory,
        });
      }
    }

    // 3. Normalized Component Scores
    const skillCoveragePercent = Math.round((matchedSkills.length / requiredSkills.length) * 100);
    const avgConfidencePercent = matchedSkills.length > 0 ? Math.round(totalConfidence / matchedSkills.length) : 20;
    const evidenceQualityPercent = matchedSkills.length > 0 ? Math.round((evidenceBackedCount / matchedSkills.length) * 100) : 0;

    // Project evidence signal: check if candidate has evaluated projects
    const hasEvaluatedProjects = userProjects.some(p => p.evaluations && p.evaluations.length > 0);
    const projectScore = hasEvaluatedProjects ? 85 : userProjects.length > 0 ? 60 : 30;

    // 4. Weighted Deterministic Calculation
    let rawScore = (
      skillCoveragePercent * 0.35 +
      avgConfidencePercent * 0.25 +
      projectScore * 0.20 +
      userReadinessScore * 0.20
    );

    // Penalize missing mandatory core requirements
    if (mandatoryMissingCount > 0) {
      rawScore = Math.max(20, rawScore - mandatoryMissingCount * 15);
    }

    const finalMatchScore = Math.min(100, Math.max(0, Math.round(rawScore)));

    // 5. Tier & Blocker Classification
    let matchLevel: 'NOT_READY' | 'PARTIALLY_READY' | 'READY' | 'STRONG_MATCH' = 'NOT_READY';
    if (finalMatchScore >= 80) matchLevel = 'STRONG_MATCH';
    else if (finalMatchScore >= 65) matchLevel = 'READY';
    else if (finalMatchScore >= 50) matchLevel = 'PARTIALLY_READY';

    const blockers: string[] = [];
    const recommendations: string[] = [];

    if (mandatoryMissingCount > 0) {
      blockers.push(`Missing ${mandatoryMissingCount} mandatory required skills: ${missingSkills.filter(m => m.isRequired).map(m => m.skillName).join(', ')}`);
      recommendations.push('Complete learning modules and pass initial assessments for required missing skills');
    }

    const minRequiredReadiness = opportunity.minReadinessScore || 50;
    if (userReadinessScore < minRequiredReadiness) {
      blockers.push(`Career readiness score (${userReadinessScore}%) is below the opportunity minimum requirement (${minRequiredReadiness}%)`);
      recommendations.push('Execute role simulations and add project work-samples to increase career readiness');
    }

    if (evidenceQualityPercent < 50 && matchedSkills.length > 0) {
      recommendations.push('Ingest codebase repositories into Project Intelligence to turn self-claims into verified evidence');
    }

    // 6. Explainable Justification
    const explanation = matchLevel === 'STRONG_MATCH'
      ? `Strong verified alignment. Candidate demonstrates ${matchedSkills.length}/${requiredSkills.length} required skills backed by high-confidence evidence and ${userReadinessScore}% career readiness.`
      : matchLevel === 'READY'
      ? `Good match for this opportunity. Core technical skills are satisfied with solid evidence backing.`
      : matchLevel === 'PARTIALLY_READY'
      ? `Developing candidate with relevant foundational skills, but requires further evidence verification and remediation of ${missingSkills.length} skills.`
      : `Substantial skill and readiness gaps identified. Candidate must build verified evidence before applying.`;

    return {
      opportunityId: opportunity.id,
      candidateId,
      matchScore: finalMatchScore,
      matchLevel,
      skillMatchScore: skillCoveragePercent,
      evidenceMatchScore: avgConfidencePercent,
      readinessMatchScore: userReadinessScore,
      projectEvidenceScore: projectScore,
      matchedSkills,
      missingSkills,
      blockers,
      recommendations,
      explanation,
    };
  }

  /**
   * Ranks candidates for an employer or placement officer
   */
  async rankCandidatesForOpportunity(
    opportunity: any,
    candidateProfiles: any[]
  ): Promise<OpportunityCandidateMatchDTO[]> {
    const results: OpportunityCandidateMatchDTO[] = [];

    for (const c of candidateProfiles) {
      const match = await this.matchCandidateToOpportunity(c.id, opportunity);
      results.push({
        candidateId: c.id,
        name: c.profile ? `${c.profile.firstName || ''} ${c.profile.lastName || ''}`.trim() || c.username || 'Candidate' : c.username || 'Candidate',
        email: c.email,
        matchScore: match.matchScore,
        matchLevel: match.matchLevel,
        readinessScore: match.readinessMatchScore,
        verifiedSkillsCount: match.matchedSkills.filter(s => s.hasEvidence).length,
        strengths: match.matchedSkills.map(s => `${s.skillName} (${s.confidence}%)`),
        missingCriticalSkills: match.missingSkills.filter(s => s.isRequired).map(s => s.skillName),
        appliedAt: c.appliedAt || null,
        applicationStatus: c.applicationStatus || null,
      });
    }

    return results.sort((a, b) => b.matchScore - a.matchScore);
  }
}

export const opportunityMatchingService = new OpportunityMatchingService();

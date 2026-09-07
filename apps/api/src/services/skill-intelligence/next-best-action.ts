// Next-Best-Action Intelligence Engine
// Phase 9: Deterministic multi-factor ranking of career-advancing actions,
// explainable supporting signals, effort estimation, and expected readiness impact.

import prismaClient from '../../lib/prisma';
import {
  CoachActionType,
  type NextBestActionDTO,
} from '@skillsync/types';
import { TargetRoleService } from './role-gap';
import { CareerReadinessService } from './career-readiness';
import { WorkSampleEvaluationService } from './work-sample-evaluation';
import { DEMO_USER_SKILLS } from '../../lib/demo-data';

export class NextBestActionService {
  private targetRoleService = new TargetRoleService();
  private careerReadinessService = new CareerReadinessService();
  private workSampleService = new WorkSampleEvaluationService();

  /**
   * Generates a ranked list of deterministic high-impact recommendations
   */
  async getRecommendedActions(userId: string, targetRoleId?: string): Promise<NextBestActionDTO[]> {
    const targetRoles = await this.targetRoleService.getTargetRoles();
    const role = targetRoleId
      ? targetRoles.find((r: any) => r.id === targetRoleId || r.slug === targetRoleId) || targetRoles[0]
      : targetRoles[0];

    const readiness = await this.careerReadinessService.calculateCareerReadiness(userId, role.id);
    const portfolio = await this.workSampleService.getPortfolioIntelligence(userId);

    let userSkills: any[] = [];
    try {
      userSkills = await prismaClient.userSkill.findMany({
        where: { userId },
        include: { skill: true, evidence: true },
      });
    } catch {
      userSkills = DEMO_USER_SKILLS as any[];
    }
    if (!userSkills || userSkills.length === 0) {
      userSkills = DEMO_USER_SKILLS as any[];
    }

    const actions: NextBestActionDTO[] = [];
    const reqs = role.skillRequirements || [];

    // 1. Check for Missing Mandatory Skills without Projects -> BUILD_PROJECT
    for (const missing of portfolio.missingRoleEvidence) {
      if (missing.isRequired) {
        actions.push({
          id: `act_proj_${missing.skillSlug}`,
          type: CoachActionType.BUILD_PROJECT,
          title: `Build a Verified ${missing.skillName} Project`,
          subtitle: `Mandatory Role Requirement for ${role.title}`,
          reason: `${missing.skillName} is a mandatory prerequisite for ${role.title}, but your portfolio currently lacks verifiable work-sample evidence.`,
          skillName: missing.skillName,
          skillSlug: missing.skillSlug,
          targetRoleTitle: role.title,
          priorityScore: 95,
          supportingSignals: [
            `${missing.skillName} is a mandatory required skill for ${role.title}.`,
            `Required proficiency: ${missing.requiredProficiency}.`,
            `Zero active project evidence detected in your portfolio for this skill.`,
            `Adding a work-sample will boost both Portfolio Strength and Role Readiness.`,
          ],
          expectedImpact: `+8% to +12% Career Readiness Boost`,
          estimatedEffort: `6–10 hours of focused building`,
          actionUrl: `/projects?create=true&skill=${missing.skillSlug}`,
          actionButtonText: `Start Project Workspace`,
          actionPayload: { skillSlug: missing.skillSlug, roleId: role.id },
        });
      }
    }

    // 2. Check for Claimed Skills with Low Confidence -> ASSESS
    for (const us of userSkills) {
      const conf = us.confidence || 50;
      const matchingReq = reqs.find((r: any) => r.skillId === us.skillId || r.skill.slug === us.skill?.slug);
      if (matchingReq && conf < 65) {
        actions.push({
          id: `act_assess_${us.skill?.slug || us.skillId}`,
          type: CoachActionType.ASSESS,
          title: `Take ${us.skill?.name || 'Skill'} Assessment Quiz`,
          subtitle: `Validate & Corroborate Skill Confidence`,
          reason: `Your confidence in ${us.skill?.name} is currently ${conf}%. Completing an adaptive benchmark quiz will produce verified evidence and elevate your confidence score.`,
          skillName: us.skill?.name,
          skillSlug: us.skill?.slug,
          targetRoleTitle: role.title,
          priorityScore: 85,
          supportingSignals: [
            `Current Bayesian Confidence: ${conf}% (below verified threshold).`,
            `Required by target role: ${matchingReq.requiredProficiency}.`,
            `Passing the quiz generates an ASSESSMENT_RESULT evidence token with 0.85 weight.`,
          ],
          expectedImpact: `+15% Confidence Increase on passing`,
          estimatedEffort: `15–20 minutes`,
          actionUrl: `/learning?tab=assessments&skillId=${us.skillId}`,
          actionButtonText: `Take Skill Quiz`,
          actionPayload: { skillId: us.skillId },
        });
      }
    }

    // 3. Check for Career Readiness Simulation -> TAKE_SIMULATION
    if (readiness.overallReadiness < 85) {
      actions.push({
        id: `act_sim_${role.slug}`,
        type: CoachActionType.TAKE_SIMULATION,
        title: `Run ${role.title} Role Simulation`,
        subtitle: `Test Real-World Production Decisions`,
        reason: `Benchmark your end-to-end operational decision-making under realistic production incidents and architectural trade-offs.`,
        targetRoleTitle: role.title,
        priorityScore: 90,
        supportingSignals: [
          `Current Role Readiness: ${readiness.overallReadiness}% (${readiness.readinessBadge}).`,
          `Simulates real-world incidents, database bottlenecks, and distributed architecture decisions.`,
          `Performance directly impacts your Assessment Readiness dimension.`,
        ],
        expectedImpact: `+5% to +10% Overall Role Readiness`,
        estimatedEffort: `20–25 minutes`,
        actionUrl: `/career-simulation`,
        actionButtonText: `Start Career Simulation`,
        actionPayload: { roleId: role.id },
      });
    }

    // 4. Check for Learning Path Milestones -> LEARN
    actions.push({
      id: `act_learn_milestone`,
      type: CoachActionType.LEARN,
      title: `Advance Active Learning Path`,
      subtitle: `Personalized Curriculum for ${role.title}`,
      reason: `Continue your structured roadmap to satisfy prerequisites and master advanced capability objectives.`,
      targetRoleTitle: role.title,
      priorityScore: 80,
      supportingSignals: [
        `Learning Path completion currently at ${readiness.dimensions.learningProgress.score}%.`,
        `Curated resources and guided capability objectives tailored to your specific skill gaps.`,
      ],
      expectedImpact: `Unlocks downstream milestones & advanced projects`,
      estimatedEffort: `2–4 hours per milestone`,
      actionUrl: `/learning`,
      actionButtonText: `Continue Roadmap`,
      actionPayload: { roleId: role.id },
    });

    // Sort descending by priorityScore
    actions.sort((a, b) => b.priorityScore - a.priorityScore);

    return actions;
  }

  /**
   * Returns the single highest-impact Next Best Action
   */
  async getNextBestAction(userId: string, targetRoleId?: string): Promise<NextBestActionDTO> {
    const actions = await this.getRecommendedActions(userId, targetRoleId);
    return actions[0];
  }
}

export const nextBestActionService = new NextBestActionService();

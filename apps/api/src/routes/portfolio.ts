// Portfolio Intelligence API Routes
// Phase 7: Portfolio aggregation, demonstrated skills, and missing evidence gaps.

import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../middleware/auth';
import { workSampleEvaluationService } from '../services/skill-intelligence/work-sample-evaluation';

const portfolioRoutes = new Hono<{ Variables: AuthVariables }>();

portfolioRoutes.use('*', authMiddleware);

// GET /portfolio - Get user portfolio intelligence overview
portfolioRoutes.get('/', async (c) => {
  const user = c.get('user');
  const portfolio = await workSampleEvaluationService.getPortfolioIntelligence(user.id);
  return c.json({ data: portfolio });
});

// GET /portfolio/skills - Get all demonstrated skills across projects
portfolioRoutes.get('/skills', async (c) => {
  const user = c.get('user');
  const portfolio = await workSampleEvaluationService.getPortfolioIntelligence(user.id);
  return c.json({
    data: {
      strongEvidenceSkills: portfolio.strongEvidenceSkills,
      moderateEvidenceSkills: portfolio.moderateEvidenceSkills,
      totalCount: portfolio.demonstratedSkillsCount,
    },
  });
});

// GET /portfolio/gaps - Get missing project evidence for target role
portfolioRoutes.get('/gaps', async (c) => {
  const user = c.get('user');
  const portfolio = await workSampleEvaluationService.getPortfolioIntelligence(user.id);
  return c.json({
    data: {
      missingRoleEvidence: portfolio.missingRoleEvidence,
      totalMissingCount: portfolio.missingRoleEvidence.length,
    },
  });
});

export default portfolioRoutes;

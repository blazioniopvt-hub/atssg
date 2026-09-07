// Career Simulation Engine
// Phase 8: Role-specific scenario simulations, technical trade-off decisions,
// server-side grading, answer-key security, and evidence generation.

import prismaClient from '../../lib/prisma';
import {
  SimulationStatus,
  type CareerSimulationDTO,
  type SimulationScenarioDTO,
  type SimulationResultDTO,
  type SimulationScenarioFeedbackDTO,
} from '@skillsync/types';
import { TargetRoleService } from './role-gap';
import { SkillConfidenceService } from './skill-confidence';
import { CareerReadinessService } from './career-readiness';
import { DEMO_SKILLS } from '../../lib/demo-data';

interface ServerScenarioDefinition {
  id: string;
  scenarioNumber: number;
  title: string;
  scenarioContext: string;
  challengePrompt: string;
  targetSkillAreas: string[];
  options: Array<{
    id: string;
    text: string;
    isOptimal: boolean;
    score: number; // 0 - 100
    explanation: string;
    tradeOffAnalysis: string;
    skillWeight: Record<string, number>;
  }>;
}

// Curated role scenario bank
const ROLE_SCENARIOS: Record<string, ServerScenarioDefinition[]> = {
  'full-stack-engineer': [
    {
      id: 'scen_fs_1',
      scenarioNumber: 1,
      title: 'Database Query Latency Under Peak Traffic',
      scenarioContext: 'Your production e-commerce checkout service latency increased from 80ms to 2400ms during a flash sale. The database CPU is at 98% with hundreds of active connection locks.',
      challengePrompt: 'Which architectural remediation strategy should you execute first?',
      targetSkillAreas: ['PostgreSQL', 'System Design', 'Node.js'],
      options: [
        {
          id: 'opt_fs_1a',
          text: 'Immediately scale vertically by doubling DB CPU/RAM and restart the instance.',
          isOptimal: false,
          score: 40,
          explanation: 'Vertical scaling is expensive, causes downtime during restart, and fails to solve the root cause of connection starvation or missing indexes.',
          tradeOffAnalysis: 'High cost with temporary relief; unaddressed N+1 queries will quickly exhaust the larger machine.',
          skillWeight: { postgresql: 40, 'system-design': 40 },
        },
        {
          id: 'opt_fs_1b',
          text: 'Analyze pg_stat_activity for slow query locks, add targeted compound indexes on the filtered columns, and enable connection pooling (PgBouncer).',
          isOptimal: true,
          score: 100,
          explanation: 'Inspecting active lock contention and establishing connection pooling addresses the immediate bottleneck without downtime.',
          tradeOffAnalysis: 'Optimal balance of immediate root-cause mitigation and sustainable throughput enhancement.',
          skillWeight: { postgresql: 100, 'system-design': 95, nodejs: 90 },
        },
        {
          id: 'opt_fs_1c',
          text: 'Rewrite the backend checkout API from Node.js to Go to improve CPU execution speed.',
          isOptimal: false,
          score: 20,
          explanation: 'The bottleneck is in the database locks, not the runtime execution speed. Rewriting during an incident introduces high regression risk.',
          tradeOffAnalysis: 'Extreme risk with zero immediate impact on database lock contention.',
          skillWeight: { 'system-design': 20, nodejs: 30 },
        },
        {
          id: 'opt_fs_1d',
          text: 'Cache all write queries in Redis and asynchronously flush to PostgreSQL once every hour.',
          isOptimal: false,
          score: 35,
          explanation: 'Asynchronous delayed writes on checkout transactions risk severe inventory overselling and financial data inconsistency.',
          tradeOffAnalysis: 'Critical ACID consistency violation for transactional financial workflows.',
          skillWeight: { postgresql: 30, 'system-design': 40 },
        },
      ],
    },
    {
      id: 'scen_fs_2',
      scenarioNumber: 2,
      title: 'Real-Time State Synchronization in React Dashboard',
      scenarioContext: 'Users report that status updates made on mobile are not updating in real-time on the desktop React dashboard unless the page is manually refreshed.',
      challengePrompt: 'How should you architect the frontend synchronization layer?',
      targetSkillAreas: ['React', 'TypeScript', 'System Design'],
      options: [
        {
          id: 'opt_fs_2a',
          text: 'Set up an aggressive setInterval timer polling the REST endpoint every 500ms on all client machines.',
          isOptimal: false,
          score: 30,
          explanation: 'High frequency polling creates severe server load (thousands of redundant QPS) and drains client battery/network bandwidth.',
          tradeOffAnalysis: 'Trivial implementation but terrible server scalability and poor battery performance.',
          skillWeight: { react: 40, 'system-design': 20 },
        },
        {
          id: 'opt_fs_2b',
          text: 'Implement Server-Sent Events (SSE) or WebSockets with typed optimistic state updates and React Query / SWR cache invalidation.',
          isOptimal: true,
          score: 100,
          explanation: 'Event-driven pushing via WebSockets/SSE delivers instant updates with minimal bandwidth and robust cache reconciliation.',
          tradeOffAnalysis: 'Minimal server overhead, sub-100ms latency, and graceful fallback mechanisms.',
          skillWeight: { react: 100, typescript: 95, 'system-design': 95 },
        },
        {
          id: 'opt_fs_2c',
          text: 'Store all dashboard state exclusively in localStorage and broadcast events across browser tabs.',
          isOptimal: false,
          score: 40,
          explanation: 'localStorage broadcast only works across tabs on the same physical browser, not across different devices (mobile to desktop).',
          tradeOffAnalysis: 'Fails to solve the cross-device multi-client requirement.',
          skillWeight: { react: 50, typescript: 40 },
        },
      ],
    },
    {
      id: 'scen_fs_3',
      scenarioNumber: 3,
      title: 'Zero-Downtime Migration for High-Volume Database',
      scenarioContext: 'You need to rename a core user attribute column from "mobile_number" to "phone_e164" on a table with 50M records and 2,000 writes/second.',
      challengePrompt: 'What is the safe engineering strategy for this schema migration?',
      targetSkillAreas: ['PostgreSQL', 'TypeScript', 'System Design'],
      options: [
        {
          id: 'opt_fs_3a',
          text: 'Run ALTER TABLE RENAME COLUMN in a standard migration during business hours.',
          isOptimal: false,
          score: 25,
          explanation: 'Running an immediate column rename locks the entire table and instantly breaks running application code that still references the old name.',
          tradeOffAnalysis: 'Immediate service outage for in-flight requests.',
          skillWeight: { postgresql: 20, 'system-design': 20 },
        },
        {
          id: 'opt_fs_3b',
          text: 'Execute an Expand-and-Contract migration: Add new column, dual-write in backend, backfill data in batches, switch reads, and finally drop the old column.',
          isOptimal: true,
          score: 100,
          explanation: 'The expand-and-contract pattern guarantees backward compatibility and zero downtime across multiple rolling releases.',
          tradeOffAnalysis: 'Requires multiple deployment phases but achieves 100% uptime with zero data loss.',
          skillWeight: { postgresql: 100, typescript: 95, 'system-design': 100 },
        },
        {
          id: 'opt_fs_3c',
          text: 'Schedule an 8-hour weekend maintenance window and take the application completely offline.',
          isOptimal: false,
          score: 45,
          explanation: 'Planned downtime violates high-availability SLAs when zero-downtime techniques are readily available.',
          tradeOffAnalysis: 'Avoids multi-step code changes but harms user trust and business availability.',
          skillWeight: { postgresql: 50, 'system-design': 40 },
        },
      ],
    },
  ],
  'ai-ml-engineer': [
    {
      id: 'scen_ai_1',
      scenarioNumber: 1,
      title: 'LLM RAG Hallucination & Retrieval Degradation',
      scenarioContext: 'Your enterprise RAG assistant frequently cites outdated policy documents and produces confident hallucinations when answering compliance questions.',
      challengePrompt: 'How should you remediate the retrieval and generation pipeline?',
      targetSkillAreas: ['Machine Learning', 'Python', 'System Design'],
      options: [
        {
          id: 'opt_ai_1a',
          text: 'Increase LLM temperature to 1.0 to encourage more creative interpretation of the documents.',
          isOptimal: false,
          score: 15,
          explanation: 'Increasing temperature magnifies stochastic hallucination risk in strict compliance workflows.',
          tradeOffAnalysis: 'Severe accuracy degradation.',
          skillWeight: { 'machine-learning': 15, python: 20 },
        },
        {
          id: 'opt_ai_1b',
          text: 'Implement hybrid search (BM25 keyword + dense embeddings), document chunk deduplication, metadata recency filtering, and reranking (Cross-Encoder).',
          isOptimal: true,
          score: 100,
          explanation: 'Hybrid search with semantic reranking and date-based metadata filtering ensures that the most relevant and up-to-date chunks reach the context window.',
          tradeOffAnalysis: 'Substantially reduces hallucination while maintaining sub-second retrieval latency.',
          skillWeight: { 'machine-learning': 100, python: 95, 'system-design': 95 },
        },
        {
          id: 'opt_ai_1c',
          text: 'Fine-tune a 70B parameter model from scratch on all historical company PDFs without retrieval.',
          isOptimal: false,
          score: 35,
          explanation: 'Fine-tuning embeds parametric memory that is slow and expensive to update when policies change next week.',
          tradeOffAnalysis: 'Extremely high compute cost with poor adaptability to changing compliance documents.',
          skillWeight: { 'machine-learning': 40, python: 30 },
        },
      ],
    },
    {
      id: 'scen_ai_2',
      scenarioNumber: 2,
      title: 'Real-Time Model Inference Latency & GPU Optimization',
      scenarioContext: 'Your PyTorch model inference service experiences p99 latency spikes of 4.5 seconds under concurrent load, exceeding the 300ms SLA.',
      challengePrompt: 'Which optimization sequence will reliably reduce p99 latency?',
      targetSkillAreas: ['Machine Learning', 'Python', 'Docker'],
      options: [
        {
          id: 'opt_ai_2a',
          text: 'Compile the model with TensorRT / ONNX Runtime, enable dynamic batching with Triton Inference Server, and quantize weights to FP16/INT8.',
          isOptimal: true,
          score: 100,
          explanation: 'Graph compilation (TensorRT) and dynamic batching maximize GPU kernel utilization and dramatically drop inference latency.',
          tradeOffAnalysis: 'Over 5x throughput improvement with negligible impact on model precision.',
          skillWeight: { 'machine-learning': 100, python: 95, docker: 90 },
        },
        {
          id: 'opt_ai_2b',
          text: 'Wrap the PyTorch script in Flask with 100 threads on a single CPU core.',
          isOptimal: false,
          score: 20,
          explanation: 'Python GIL blocks parallel CPU execution, and running heavy neural net inference on CPU will cause extreme latency bottlenecks.',
          tradeOffAnalysis: 'Severe performance collapse.',
          skillWeight: { python: 20, 'machine-learning': 15 },
        },
      ],
    },
  ],
};

const inMemorySimulations = new Map<string, any>();

export class CareerSimulationService {
  private targetRoleService = new TargetRoleService();
  private confidenceService = new SkillConfidenceService();
  private careerReadinessService = new CareerReadinessService();

  /**
   * Generates a new adaptive career simulation for a target role
   */
  async createSimulation(
    userId: string,
    targetRoleId?: string
  ): Promise<CareerSimulationDTO> {
    const targetRoles = await this.targetRoleService.getTargetRoles();
    const role = targetRoleId
      ? targetRoles.find((r: any) => r.id === targetRoleId || r.slug === targetRoleId) || targetRoles[0]
      : targetRoles[0];

    const slug = role.slug;
    const scenariosDef = ROLE_SCENARIOS[slug] || ROLE_SCENARIOS['full-stack-engineer'];

    // Map scenarios to client-safe DTOs (strip correct answers & scores)
    const clientScenarios: SimulationScenarioDTO[] = scenariosDef.map(sc => ({
      id: sc.id,
      scenarioNumber: sc.scenarioNumber,
      title: sc.title,
      scenarioContext: sc.scenarioContext,
      challengePrompt: sc.challengePrompt,
      targetSkillAreas: sc.targetSkillAreas,
      options: sc.options.map(o => ({
        id: o.id,
        text: o.text,
      })),
    }));

    const simulationId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const simulationRecord = {
      id: simulationId,
      userId,
      targetRoleId: role.id,
      targetRoleTitle: role.title,
      title: `${role.title} Career Readiness Simulation`,
      description: `Evaluate your production decision-making, architectural trade-offs, and debugging capability for ${role.title}.`,
      status: SimulationStatus.CREATED,
      timeLimit: 25, // 25 minutes
      scenarios: clientScenarios,
      serverScenarios: scenariosDef, // internal for server grading
      maxScore: 100,
      score: null,
      percentage: null,
      skillScores: null,
      decisionQuality: null,
      weakAreas: null,
      strongAreas: null,
      startedAt: null,
      submittedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      await prismaClient.careerSimulation.create({
        data: {
          id: simulationId,
          userId,
          targetRoleId: role.id,
          title: simulationRecord.title,
          description: simulationRecord.description,
          status: 'CREATED',
          timeLimit: 25,
          scenarios: clientScenarios as any,
          maxScore: 100,
        },
      });
    } catch {
      // Memory fallback
    }

    inMemorySimulations.set(simulationId, simulationRecord);

    return this.mapToDTO(simulationRecord);
  }

  /**
   * Starts a simulation timer
   */
  async startSimulation(userId: string, simulationId: string): Promise<CareerSimulationDTO> {
    const sim = await this.getSimulationInternal(userId, simulationId);
    if (!sim) throw new Error('Simulation not found');

    sim.status = SimulationStatus.IN_PROGRESS;
    sim.startedAt = new Date();

    try {
      await prismaClient.careerSimulation.update({
        where: { id: simulationId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: sim.startedAt,
        },
      });
    } catch {
      // Memory fallback
    }

    inMemorySimulations.set(simulationId, sim);
    return this.mapToDTO(sim);
  }

  /**
   * Server-side grading of user submitted simulation decisions
   */
  async submitSimulation(
    userId: string,
    simulationId: string,
    answers: Record<string, string> // scenarioId -> optionId
  ): Promise<SimulationResultDTO> {
    const sim = await this.getSimulationInternal(userId, simulationId);
    if (!sim) throw new Error('Simulation not found');

    const serverScenarios: ServerScenarioDefinition[] =
      sim.serverScenarios ||
      ROLE_SCENARIOS[sim.targetRoleSlug || 'full-stack-engineer'] ||
      ROLE_SCENARIOS['full-stack-engineer'];

    // 1. Grade each scenario server-side
    let totalScore = 0;
    const feedbackList: SimulationScenarioFeedbackDTO[] = [];
    const skillScoreAccumulator: Record<string, { total: number; count: number }> = {};

    for (const scenario of serverScenarios) {
      const selectedOptionId = answers[scenario.id];
      const selectedOption = scenario.options.find(o => o.id === selectedOptionId) || scenario.options[0];
      const isOptimal = selectedOption.isOptimal;
      const score = selectedOption.score;

      totalScore += score;

      feedbackList.push({
        scenarioId: scenario.id,
        scenarioNumber: scenario.scenarioNumber,
        userSelection: selectedOption.text,
        wasOptimal: isOptimal,
        scoreAwarded: score,
        maxScore: 100,
        optimalChoiceExplanation: selectedOption.explanation,
        tradeOffAnalysis: selectedOption.tradeOffAnalysis,
      });

      // Accumulate skill scores
      for (const [skillKey, weight] of Object.entries(selectedOption.skillWeight || {})) {
        if (!skillScoreAccumulator[skillKey]) {
          skillScoreAccumulator[skillKey] = { total: 0, count: 0 };
        }
        skillScoreAccumulator[skillKey].total += weight;
        skillScoreAccumulator[skillKey].count += 1;
      }
    }

    const maxScore = serverScenarios.length * 100;
    const percentage = Math.round((totalScore / maxScore) * 100);
    const passed = percentage >= 70;

    // Skill breakdown
    const skillScores: Record<string, number> = {};
    const strongAreas: string[] = [];
    const weakAreas: string[] = [];

    for (const [skillKey, data] of Object.entries(skillScoreAccumulator)) {
      const avg = Math.round(data.total / data.count);
      skillScores[skillKey] = avg;
      if (avg >= 75) {
        strongAreas.push(skillKey);
      } else {
        weakAreas.push(skillKey);
      }
    }

    // 2. Fetch previous readiness and calculate new readiness
    const previousReadinessObj = await this.careerReadinessService.calculateCareerReadiness(userId, sim.targetRoleId);
    const previousReadiness = previousReadinessObj.overallReadiness;

    // 3. Create Simulation Evidence and bridge into Phase 4 confidence
    const updatedSkillsList: string[] = [];
    for (const skillKey of Object.keys(skillScores)) {
      try {
        const matchedSkill = DEMO_SKILLS.find(s => s.slug === skillKey) || {
          id: `sk_${skillKey}`,
          name: skillKey,
          slug: skillKey,
        };

        let userSkill = await prismaClient.userSkill.findUnique({
          where: { userId_skillId: { userId, skillId: matchedSkill.id } },
        });

        if (!userSkill) {
          userSkill = await prismaClient.userSkill.create({
            data: {
              userId,
              skillId: matchedSkill.id,
              proficiencyLevel: percentage >= 80 ? 'ADVANCED' : 'INTERMEDIATE',
              confidence: percentage,
              verificationStatus: 'VERIFIED',
              verificationMethod: 'ASSESSMENT_PASSED',
            },
          });
        }

        const evidenceTitle = `Career Simulation: ${sim.title}`;
        await prismaClient.skillEvidence.create({
          data: {
            userSkillId: userSkill.id,
            skillId: matchedSkill.id,
            type: 'ASSESSMENT_RESULT',
            title: evidenceTitle,
            description: `Scored ${percentage}% on role-critical production simulation challenges.`,
            metadata: {
              simulationId,
              source: 'SIMULATION',
              score: percentage,
              confidence: percentage / 100,
            },
          },
        });

        updatedSkillsList.push(matchedSkill.name);
      } catch {
        // Safe fallback
      }
    }

    // Update simulation record in DB
    sim.status = SimulationStatus.COMPLETED;
    sim.score = totalScore;
    sim.percentage = percentage;
    sim.skillScores = skillScores;
    sim.weakAreas = weakAreas;
    sim.strongAreas = strongAreas;
    sim.submittedAt = new Date();

    try {
      await prismaClient.careerSimulation.update({
        where: { id: simulationId },
        data: {
          status: 'COMPLETED',
          score: totalScore,
          percentage,
          skillScores: skillScores as any,
          weakAreas: weakAreas as any,
          strongAreas: strongAreas as any,
          feedback: feedbackList as any,
          submittedAt: sim.submittedAt,
        },
      });
    } catch {
      // Memory fallback
    }

    inMemorySimulations.set(simulationId, sim);

    const newReadinessObj = await this.careerReadinessService.calculateCareerReadiness(userId, sim.targetRoleId);
    const newReadiness = Math.min(100, Math.max(previousReadiness, newReadinessObj.overallReadiness + (passed ? 5 : 1)));

    return {
      simulationId,
      targetRoleId: sim.targetRoleId,
      targetRoleTitle: sim.targetRoleTitle || 'Target Role',
      score: totalScore,
      maxScore,
      percentage,
      passed,
      skillScores,
      strongAreas,
      weakAreas,
      feedback: feedbackList,
      readinessImpact: {
        previousReadiness,
        newReadiness,
        delta: Math.max(0, newReadiness - previousReadiness),
      },
      evidenceCreated: {
        evidenceId: `ev_sim_${simulationId}`,
        skillsUpdated: updatedSkillsList,
      },
    };
  }

  /**
   * Retrieves single simulation by ID with ownership verification
   */
  async getSimulation(userId: string, simulationId: string): Promise<CareerSimulationDTO | null> {
    const sim = await this.getSimulationInternal(userId, simulationId);
    if (!sim) return null;
    return this.mapToDTO(sim);
  }

  /**
   * Retrieves all simulations for a user
   */
  async getUserSimulations(userId: string): Promise<CareerSimulationDTO[]> {
    try {
      const simulations = await prismaClient.careerSimulation.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      if (simulations && simulations.length > 0) {
        return simulations.map((s: any) => this.mapToDTO(s));
      }
    } catch {
      // Memory fallback
    }

    const list = Array.from(inMemorySimulations.values()).filter((s: any) => s.userId === userId);
    return list.map((s: any) => this.mapToDTO(s));
  }

  private async getSimulationInternal(userId: string, simulationId: string): Promise<any> {
    try {
      const sim = await prismaClient.careerSimulation.findFirst({
        where: { id: simulationId, userId },
      });
      if (sim) return sim;
    } catch {
      // Memory fallback
    }
    const mem = inMemorySimulations.get(simulationId);
    if (mem && mem.userId === userId) return mem;
    return null;
  }

  private mapToDTO(sim: any): CareerSimulationDTO {
    return {
      id: sim.id,
      userId: sim.userId,
      targetRoleId: sim.targetRoleId,
      targetRoleTitle: sim.targetRoleTitle || 'Target Role',
      title: sim.title,
      description: sim.description,
      status: sim.status,
      timeLimit: sim.timeLimit || 25,
      scenarios: Array.isArray(sim.scenarios) ? sim.scenarios : [],
      maxScore: sim.maxScore || 100,
      score: sim.score,
      percentage: sim.percentage,
      skillScores: sim.skillScores,
      decisionQuality: sim.decisionQuality,
      weakAreas: Array.isArray(sim.weakAreas) ? sim.weakAreas : [],
      strongAreas: Array.isArray(sim.strongAreas) ? sim.strongAreas : [],
      startedAt: sim.startedAt,
      submittedAt: sim.submittedAt,
      createdAt: sim.createdAt || new Date(),
      updatedAt: sim.updatedAt || new Date(),
    };
  }
}

export const careerSimulationService = new CareerSimulationService();

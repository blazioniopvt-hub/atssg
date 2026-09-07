// Skill Intelligence Configuration
// Centralized configuration for evidence weighting and confidence calculation

export interface EvidenceWeights {
  SELF_REPORTED: number;
  PROJECT: number;
  CERTIFICATE: number;
  PORTFOLIO_ITEM: number;
  EXPERIENCE: number;
  ASSESSMENT_RESULT: number;
  OTHER: number;
}

export const EVIDENCE_WEIGHTS: EvidenceWeights = {
  SELF_REPORTED: 0.1,
  PROJECT: 0.3,
  CERTIFICATE: 0.25,
  PORTFOLIO_ITEM: 0.2,
  EXPERIENCE: 0.25,
  ASSESSMENT_RESULT: 0.4,
  OTHER: 0.15,
};

export interface ProficiencyBaseline {
  BEGINNER: number;
  INTERMEDIATE: number;
  ADVANCED: number;
  EXPERT: number;
}

export const PROFICIENCY_BASELINE: ProficiencyBaseline = {
  BEGINNER: 0.1,
  INTERMEDIATE: 0.3,
  ADVANCED: 0.6,
  EXPERT: 0.85,
};

export interface ConfidenceThresholds {
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  VERY_HIGH: number;
}

export const CONFIDENCE_THRESHOLDS: ConfidenceThresholds = {
  LOW: 0.3,
  MEDIUM: 0.5,
  HIGH: 0.7,
  VERY_HIGH: 0.85,
};

export const MAX_CONFIDENCE = 1.0;
export const MIN_CONFIDENCE = 0.0;

export const DEFAULT_EVIDENCE_DECAY_DAYS = 365;
export const MAX_EVIDENCE_ITEMS_PER_TYPE = 10;

export function getEvidenceWeight(type: string): number {
  const weights: Record<string, number> = {
    SELF_REPORTED: EVIDENCE_WEIGHTS.SELF_REPORTED,
    PROJECT: EVIDENCE_WEIGHTS.PROJECT,
    CERTIFICATE: EVIDENCE_WEIGHTS.CERTIFICATE,
    PORTFOLIO_ITEM: EVIDENCE_WEIGHTS.PORTFOLIO_ITEM,
    EXPERIENCE: EVIDENCE_WEIGHTS.EXPERIENCE,
    ASSESSMENT_RESULT: EVIDENCE_WEIGHTS.ASSESSMENT_RESULT,
    OTHER: EVIDENCE_WEIGHTS.OTHER,
  };
  return weights[type] ?? EVIDENCE_WEIGHTS.OTHER;
}

export function getProficiencyBaseline(level: string): number {
  const baselines: Record<string, number> = {
    BEGINNER: PROFICIENCY_BASELINE.BEGINNER,
    INTERMEDIATE: PROFICIENCY_BASELINE.INTERMEDIATE,
    ADVANCED: PROFICIENCY_BASELINE.ADVANCED,
    EXPERT: PROFICIENCY_BASELINE.EXPERT,
  };
  return baselines[level] ?? PROFICIENCY_BASELINE.BEGINNER;
}

export function getConfidenceLevel(score: number): string {
  if (score >= CONFIDENCE_THRESHOLDS.VERY_HIGH) return 'VERY_HIGH';
  if (score >= CONFIDENCE_THRESHOLDS.HIGH) return 'HIGH';
  if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'MEDIUM';
  if (score >= CONFIDENCE_THRESHOLDS.LOW) return 'LOW';
  return 'VERY_LOW';
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================================
// PHASE 4: EVIDENCE RELIABILITY, SPECIFICITY & RECENCY CONFIG
// ============================================================

export const EVIDENCE_SOURCE_WEIGHTS: Record<string, number> = {
  WORK_SAMPLE: 0.95,
  ASSESSMENT: 0.90,
  EXTERNAL: 0.80,
  CERTIFICATION: 0.75,
  PROJECT: 0.70,
  RESUME: 0.55,
  SELF_REPORTED: 0.35,
  // Schema enum compatibility aliases
  CERTIFICATE: 0.75,
  WORK_EXPERIENCE: 0.55,
  PORTFOLIO_ITEM: 0.70,
  ASSESSMENT_RESULT: 0.90,
  OTHER: 0.40,
};

export function getEvidenceSourceWeight(source: string): number {
  const normalized = (source || '').toUpperCase().trim();
  return EVIDENCE_SOURCE_WEIGHTS[normalized] ?? 0.40;
}

export function evaluateSpecificity(text: string): number {
  if (!text || text.trim().length === 0) return 0.5;
  const trimmed = text.trim();
  
  // Base specificity
  let score = 0.6;
  
  // Action verbs indicating actual implementation/building
  const actionRegex = /\b(built|developed|architected|designed|implemented|optimized|deployed|created|engineered|integrated|refactored|trained|scaled|configured)\b/i;
  if (actionRegex.test(trimmed)) {
    score += 0.15;
  }
  
  // Specific technology or contextual tool usage
  const techRegex = /\b(framework|pipeline|database|api|model|system|library|service|microservice|cluster|docker|kubernetes|pytorch|tensorflow|react|node|postgres|aws|gcp|rest|graphql)\b/i;
  if (techRegex.test(trimmed)) {
    score += 0.15;
  }
  
  // Measurable metrics, scale, or quantitative outcome
  const metricRegex = /\b(\d+k|\d+m|\d+%\s*|\d+\s*(users|requests|qps|rps|images|records|lines|stars|commits)|reduced|increased|improved|latency|throughput)\b/i;
  if (metricRegex.test(trimmed)) {
    score += 0.10;
  }

  // Formal assessment or certified credential context
  const credentialRegex = /\b(assessment|exam|benchmark|certified|certification|credential|test|passed|score|quiz)\b/i;
  if (credentialRegex.test(trimmed)) {
    score += 0.15;
  }

  // Penalty if it's merely a single keyword with no context
  if (trimmed.split(/\s+/).length <= 2 && !actionRegex.test(trimmed) && !credentialRegex.test(trimmed)) {
    score = Math.min(score, 0.6);
  }

  return Math.min(1.0, Math.max(0.5, Math.round(score * 100) / 100));
}

export function calculateRecencyDecay(date: Date | string | null | undefined): number {
  if (!date) return 0.75;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 0.75;
  
  const now = Date.now();
  const diffDays = Math.max(0, (now - d.getTime()) / (1000 * 60 * 60 * 24));
  
  // Half-life ~2 years (730 days), floor at 0.65
  const factor = 0.65 + 0.35 * Math.exp(-diffDays / 730);
  return Math.min(1.0, Math.max(0.65, Math.round(factor * 100) / 100));
}
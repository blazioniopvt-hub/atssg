// AI Extraction Validation Schemas
import { z } from 'zod';
import { EvidenceType } from '@prisma/client';

export const extractSkillsSchema = z.object({
  text: z.string()
    .min(10, 'Input text must be at least 10 characters')
    .max(50000, 'Input text must not exceed 50,000 characters'),
  context: z.string().max(2000, 'Context must not exceed 2,000 characters').optional(),
});

export const extractSkillsResponseSchema = z.object({
  skills: z.array(z.object({
    name: z.string().min(1, 'Skill name is required').max(100, 'Skill name too long'),
    evidence: z.string().min(1, 'Evidence is required').max(500, 'Evidence too long'),
    confidence: z.number().min(0).max(1, 'Confidence must be between 0 and 1'),
    reason: z.string().min(1, 'Reason is required').max(200, 'Reason too long'),
  })).max(50, 'Too many skills extracted'),
});

export type ExtractSkillsInput = z.infer<typeof extractSkillsSchema>;
export type ExtractSkillsResponse = z.infer<typeof extractSkillsResponseSchema>;
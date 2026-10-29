import { z } from 'zod';

export const sourceItemInputSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['url', 'text']),
  value: z.string().min(1, 'Source value cannot be empty'),
  label: z.string().optional(),
});

export const researchRequestSchema = z.object({
  sources: z.array(sourceItemInputSchema)
    .min(3, 'At least 3 sources are required to conduct editorial research')
    .max(8, 'Maximum 8 sources allowed per research brief'),
});

export const claimTypeEnum = z.enum(['fact', 'analysis', 'speculation']);

export const claimSchema = z.object({
  id: z.string(),
  sourceId: z.string().optional(),
  text: z.string().min(1),
  type: claimTypeEnum,
  evidenceQuote: z.string().min(1),
  verified: z.boolean().optional(),
  verificationMatchRatio: z.number().optional(),
  sourceUrl: z.string().optional(),
  sourceTitle: z.string().optional(),
});

export const sourceAnalysisSchema = z.object({
  sourceId: z.string(),
  summary: z.string().min(10),
  claims: z.array(claimSchema).min(1, 'Each analyzed source must yield at least one quote-backed claim'),
});

export const developmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  whatHappened: z.string(),
  whyItMatters: z.object({
    founders: z.string(),
    builders: z.string(),
    operators: z.string(),
  }),
  whoShouldCare: z.string(),
  evidenceClaimIds: z.array(z.string()).min(1),
  openUncertainties: z.array(z.string()),
});

export const newsletterAngleSchema = z.object({
  id: z.string(),
  headline: z.string(),
  thesis: z.string(),
  whyNow: z.string(),
  supportingClaimIds: z.array(z.string()).min(1),
  counterpoint: z.string(),
  practicalImplication: z.string(),
});

export const synthesisSchema = z.object({
  developments: z.array(developmentSchema).min(1),
  tensions: z.object({
    agreements: z.array(z.string()),
    conflicts: z.array(z.string()),
    gaps: z.array(z.string()),
  }),
  newsletterAngles: z.array(newsletterAngleSchema).min(2).max(4),
  recommendedAngle: z.object({
    angleId: z.string(),
    reasoning: z.string(),
  }),
});

export const llmResearchStage1OutputSchema = z.object({
  sourceAnalyses: z.array(sourceAnalysisSchema),
});

export const llmResearchStage2OutputSchema = synthesisSchema;

export const writingAnalyzeRequestSchema = z.object({
  draft: z.string(),
});


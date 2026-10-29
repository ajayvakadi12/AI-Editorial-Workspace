import { extractAllSources } from './articleExtractor.js';
import { verifyAllClaims } from './quoteVerifier.js';
import {
  callLlmStructured,
  getMockResearchResponse,
} from './llmClient.js';
import {
  RESEARCH_STAGE1_SYSTEM_PROMPT,
  buildStage1UserPrompt,
  RESEARCH_STAGE2_SYSTEM_PROMPT,
  buildStage2UserPrompt,
} from '../prompts/researchPrompts.js';
import {
  llmResearchStage1OutputSchema,
  llmResearchStage2OutputSchema,
} from '../utils/schemas.js';

/**
 * Conducts the full research analysis pipeline:
 * 1. Extraction with SSRF defense & content sanitization
 * 2. Stage 1 LLM per-source analysis & quote extraction
 * 3. Stage 2 LLM cross-source synthesis & angle generation
 * 4. Deterministic quote verification
 * 5. Aggregation into an actionable editorial brief
 */
export async function runResearchPipeline(sourceInputs) {
  // Step 1: Deterministic source extraction
  const extractedSources = await extractAllSources(sourceInputs);

  const usableSources = extractedSources.filter((s) => s.status === 'ok' || s.status === 'partial');
  const failedSources = extractedSources.filter((s) => s.status === 'failed');

  // Guard: Require at least 3 usable sources
  if (usableSources.length < 3) {
    return {
      success: false,
      error: {
        code: 'INSUFFICIENT_USABLE_SOURCES',
        message: `Research brief requires at least 3 usable sources, but only ${usableSources.length} succeeded (${failedSources.length} failed). Please review the failed sources below and paste text directly to proceed.`,
        usableCount: usableSources.length,
        requiredCount: 3,
      },
      sourceStatuses: extractedSources.map(formatSourceStatus),
      extractedSources, // keep extracted sources so client can display and retry without re-fetching
    };
  }

  const isMock = process.env.LLM_MOCK === 'true';
  let stage1Analyses;
  let synthesis;

  if (isMock) {
    // Generate realistic mock output tailored to the provided sources
    const mockOutput = getMockResearchResponse(usableSources);
    stage1Analyses = mockOutput.sourceAnalyses;
    synthesis = mockOutput.synthesis;
  } else {
    // Stage 1: Per-source claims and summaries
    const stage1Result = await callLlmStructured({
      systemPrompt: RESEARCH_STAGE1_SYSTEM_PROMPT,
      userPrompt: buildStage1UserPrompt(usableSources),
      zodSchema: llmResearchStage1OutputSchema,
      taskDescription: 'Research Stage 1: Source Claims Analysis',
    });
    stage1Analyses = stage1Result.sourceAnalyses;

    // Stage 2: Cross-source synthesis and angle generation
    synthesis = await callLlmStructured({
      systemPrompt: RESEARCH_STAGE2_SYSTEM_PROMPT,
      userPrompt: buildStage2UserPrompt(stage1Analyses, usableSources),
      zodSchema: llmResearchStage2OutputSchema,
      taskDescription: 'Research Stage 2: Cross-Source Synthesis',
    });
  }

  // Step 4: Deterministic quote verification
  const { enrichedAnalyses, verificationStats } = verifyAllClaims(stage1Analyses, usableSources);

  // Flatten all claims for easy client lookup
  const allClaims = [];
  for (const analysis of enrichedAnalyses) {
    for (const claim of analysis.claims) {
      allClaims.push(claim);
    }
  }

  // Step 5: Format final source statuses with verification rates
  const formattedSourceStatuses = extractedSources.map((src) => {
    const stats = verificationStats[src.id] || { totalClaims: 0, verifiedClaims: 0, verificationRate: 0 };
    return {
      ...formatSourceStatus(src),
      verificationStats: stats,
    };
  });

  return {
    success: true,
    isMock,
    timestamp: new Date().toISOString(),
    sourceStatuses: formattedSourceStatuses,
    sourceAnalyses: enrichedAnalyses,
    synthesis,
    allClaims,
  };
}

function formatSourceStatus(src) {
  return {
    id: src.id,
    type: src.type,
    url: src.url,
    title: src.title,
    status: src.status,
    reason: src.reason,
    textLength: src.textLength,
    truncated: src.truncated,
  };
}


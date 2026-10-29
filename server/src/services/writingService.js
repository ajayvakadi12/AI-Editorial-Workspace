import { runAllWritingRules, getContextualSynonym, getSentenceAroundOffset } from '../utils/writingRules.js';
import { computeWritingMetrics } from '../utils/writingMetrics.js';
import { callLlmStructured } from './llmClient.js';
import { z } from 'zod';

/**
 * Validates whether a suggested replacement is usable and non-placeholder.
 * Explicitly allows empty strings ONLY for intentional filler phrase omissions.
 */
export function isValidSuggestionReplacement(issue, replacement) {
  // Intentional omission for true filler phrases
  if (issue.type === 'filler_phrase' && issue.suggestion?.isOmission === true && replacement === '') {
    return { valid: true };
  }

  if (typeof replacement !== 'string') {
    return { valid: false, reason: 'Replacement must be a string' };
  }

  const trimmed = replacement.trim();
  if (trimmed === '') {
    return { valid: false, reason: 'Replacement cannot be empty' };
  }

  // Reject bracketed and generic placeholder patterns
  const placeholderPatterns = [
    /^\[.*\]$/,
    /delete\s+flagged/i,
    /suggested\s+revision/i,
    /insert\s+replacement/i,
    /placeholder/i,
    /todo/i,
  ];

  for (const pattern of placeholderPatterns) {
    if (pattern.test(trimmed)) {
      return { valid: false, reason: `Replacement contains placeholder text: "${trimmed}"` };
    }
  }

  // Sanity check: Ensure replacement is proportional and doesn't wipe out a sentence
  if (issue.original && issue.original.length < 20 && trimmed.length > 300) {
    return { valid: false, reason: 'Replacement length is disproportionate to flagged word' };
  }

  return { valid: true };
}

/**
 * Extracts numbers from text for hallucination guardrails.
 */
function extractNumbers(text) {
  const matches = text.match(/\b\d+(?:\.\d+)?%?\b/g) || [];
  return new Set(matches);
}

/**
 * Extracts proper nouns / capitalized terms (excluding first word of sentence).
 */
function extractProperNouns(text) {
  const words = text.split(/\s+/);
  const nouns = new Set();
  for (let i = 1; i < words.length; i++) {
    const clean = words[i].replace(/[^a-zA-Z0-9]/g, '');
    if (clean.length > 2 && /^[A-Z]/.test(clean)) {
      nouns.add(clean.toLowerCase());
    }
  }
  return nouns;
}

/**
 * Validates whether an LLM rewrite preserved numbers, URLs, and proper entities.
 */
export function checkRewriteIntegrity(originalSpan, suggestedRewrite) {
  if (!suggestedRewrite) return { safe: true };

  const origNumbers = extractNumbers(originalSpan);
  const newNumbers = extractNumbers(suggestedRewrite);

  // Check if any numbers from original were dropped
  const droppedNumbers = [...origNumbers].filter((n) => !newNumbers.has(n));
  // Check if new ungrounded numbers were introduced
  const addedNumbers = [...newNumbers].filter((n) => !origNumbers.has(n));

  const origNouns = extractProperNouns(originalSpan);
  const newNouns = extractProperNouns(suggestedRewrite);
  const droppedNouns = [...origNouns].filter((n) => !newNouns.has(n));

  const origUrls = (originalSpan.match(/https?:\/\/[^\s]+/g) || []);
  const newUrls = (suggestedRewrite.match(/https?:\/\/[^\s]+/g) || []);
  const urlMismatch = origUrls.length !== newUrls.length;

  const hasIssues = droppedNumbers.length > 0 || addedNumbers.length > 0 || droppedNouns.length > 0 || urlMismatch;

  if (hasIssues) {
    const reasons = [];
    if (droppedNumbers.length > 0) reasons.push(`dropped number(s): ${droppedNumbers.join(', ')}`);
    if (addedNumbers.length > 0) reasons.push(`added unverified number(s): ${addedNumbers.join(', ')}`);
    if (droppedNouns.length > 0) reasons.push(`omitted entity: ${droppedNouns.join(', ')}`);
    if (urlMismatch) reasons.push('URL count mismatch');

    return {
      safe: false,
      warning: `Integrity Guard: Suggested rewrite may alter factual entities (${reasons.join('; ')}). Review with caution.`,
      droppedNumbers,
      addedNumbers,
    };
  }

  return { safe: true };
}

const rewriteResponseSchema = z.object({
  rewrites: z.array(
    z.object({
      issueId: z.string(),
      replacement: z.string(),
      rationale: z.string(),
    })
  ),
});

/**
 * Generates LLM-backed rewrite suggestions for long sentences, passive constructions,
 * and repetitive phrasing, validating each with deterministic entity/number guards.
 */
export async function enrichIssuesWithGuardedRewrites(issues, draft) {
  // Target issues that lack a complete replacement or are eligible for LLM enhancement
  const candidates = issues.filter(
    (i) => (!i.suggestion || !i.suggestion.replacement) &&
           (i.type === 'long_sentence' || i.type === 'hard_to_follow' || i.type === 'repetition' || i.type === 'passive_voice')
  );

  if (candidates.length === 0) {
    return issues;
  }

  const isMock = process.env.LLM_MOCK === 'true';

  if (isMock) {
    // Generate deterministic mock rewrites for candidates
    return issues.map((issue) => {
      if (issue.type === 'long_sentence') {
        const words = issue.original.split(' ');
        const mid = Math.floor(words.length / 2);
        const sentence1 = words.slice(0, mid).join(' ') + '.';
        const sentence2 = words.slice(mid).join(' ');
        const capitalizedSentence2 = sentence2.charAt(0).toUpperCase() + sentence2.slice(1);
        const mockRewrite = `${sentence1} ${capitalizedSentence2}`;

        const integrity = checkRewriteIntegrity(issue.original, mockRewrite);

        return {
          ...issue,
          suggestion: {
            replacement: mockRewrite,
            rationale: 'Split into two distinct, high-impact statements.',
            integrityWarning: integrity.safe ? undefined : integrity.warning,
          },
        };
      }

      if (issue.type === 'repetition') {
        const mockSynonyms = {
          rapidly: 'swiftly',
          significant: 'notable',
          massive: 'substantial',
          transforming: 'converting',
          previously: 'earlier',
          conducted: 'performed',
          optimize: 'refine',
          improve: 'enhance',
          automate: 'streamline',
          automated: 'streamlined',
          automating: 'streamlining',
          'high-risk': 'speculative',
          'high-priority': 'critical',
          critical: 'essential',
          primary: 'key',
          problem: 'issue',
          throughput: 'velocity',
          expensive: 'costly',
        };
        const lower = issue.original.toLowerCase();
        const replacement = mockSynonyms[lower] || getContextualSynonym(issue.original) || 'alternative';

        return {
          ...issue,
          suggestion: {
            replacement,
            rationale: `Replaces repeated word "${issue.original}" with contextually appropriate synonym "${replacement}" to eliminate echo.`,
          },
        };
      }

      if (issue.type === 'passive_voice') {
        return {
          ...issue,
          suggestion: {
            replacement: issue.original.replace(/\b(?:was|were|is|are)\s+([a-zA-Z]+ed|[a-zA-Z]+)\b/i, '$1'),
            rationale: 'Converted passive construction to direct active phrasing.',
          },
        };
      }

      return issue;
    });
  }

  // Live LLM rewrite request
  try {
    const candidatePayload = candidates.slice(0, 5).map((c) => ({
      id: c.id,
      originalText: c.original,
      issueType: c.type,
      explanation: c.explanation,
      sentenceContext: c.sentenceContext || getSentenceAroundOffset(draft, c.start, c.end),
    }));

    const systemPrompt = `
You are a master editor for "This Week in AI" newsletter.
Your task is to provide crisp, concise rewrites for flagged long sentences, passive phrasing, or repetitive words.

MANDATORY EDITORIAL INTEGRITY RULES:
1. PRESERVE MEANING: Do NOT add new claims, speculation, or commentary.
2. PRESERVE UNCERTAINTY: Do NOT remove hedges (e.g. "may", "early data suggests", "approximately") that carry real uncertainty.
3. PRESERVE ENTITIES: Do NOT change, omit, or invent numbers, percentages, company names, model names, or citations. Never replace proper nouns (such as "Claude" or "Anthropic") or technical terms with incorrect synonyms.
4. FOR REPETITIVE PHRASING: Inspect the provided "sentenceContext". Provide an exact replacement for the repeated word or phrase that fits seamlessly and grammatically into the sentence.
5. NO GENERIC PLACEHOLDERS: NEVER return bracketed placeholders like "[Delete flagged filler phrase]" or "[Suggested revision]", or empty strings. Provide the exact replacement text to be substituted.

REQUIRED OUTPUT FORMAT:
You MUST return a single JSON object with exactly this structure:
{
  "rewrites": [
    {
      "issueId": "the id from the input",
      "replacement": "the revised text",
      "rationale": "brief explanation of the change"
    }
  ]
}

The top-level key MUST be "rewrites" and its value MUST be an array. Do NOT use alternative keys like "suggestions", "results", or "edits".
`.trim();

    const userPrompt = `
Draft Context:
${draft.slice(0, 800)}...

Flagged passages requiring rewrites:
${JSON.stringify(candidatePayload, null, 2)}
`;

    const result = await callLlmStructured({
      systemPrompt,
      userPrompt,
      zodSchema: rewriteResponseSchema,
      taskDescription: 'Writing Assistant: Sentence Rewriting',
    });

    const rewriteMap = new Map(result.rewrites.map((r) => [r.issueId, r]));

    return issues.map((issue) => {
      const rewrite = rewriteMap.get(issue.id);
      if (rewrite) {
        // Validate replacement: reject empty strings and bracketed placeholders
        const validation = isValidSuggestionReplacement(issue, rewrite.replacement);
        if (!validation.valid) {
          console.warn(`[WritingService] Rejecting invalid LLM rewrite for ${issue.id}: ${validation.reason}`);
          return {
            ...issue,
            suggestionError: 'AI suggested an invalid revision. Manual edit recommended.',
            suggestion: {
              rationale: 'Review flagged passage and customize revision directly.',
            },
          };
        }

        const integrity = checkRewriteIntegrity(issue.original, rewrite.replacement);
        return {
          ...issue,
          suggestion: {
            replacement: rewrite.replacement,
            rationale: rewrite.rationale,
            integrityWarning: integrity.safe ? undefined : integrity.warning,
          },
        };
      }
      return issue;
    });
  } catch (err) {
    // If LLM fails or times out, degrade gracefully: do not substitute empty string or generic placeholder
    console.warn(`[WritingService] LLM rewrite generation skipped or failed: ${err.message}`);
    return issues.map((issue) => {
      if (!issue.suggestion || !issue.suggestion.replacement) {
        return {
          ...issue,
          suggestionError: 'AI rewrite temporarily unavailable. Click Edit to customize directly.',
          suggestion: {
            replacement: issue.original,
            rationale: 'Review flagged passage and customize revision directly.',
          },
        };
      }
      return issue;
    });
  }
}

/**
 * Complete writing analysis pipeline:
 * 1. Runs deterministic rules
 * 2. Computes reading metrics
 * 3. Enriches with guarded rewrites
 */
export async function analyzeDraft(draft) {
  const issues = runAllWritingRules(draft);

  // Count passive voice sentences
  const passiveIssues = issues.filter((i) => i.type === 'passive_voice');
  const metrics = computeWritingMetrics(draft, passiveIssues.length);

  // Enrich with guarded rewrites
  const enrichedIssues = await enrichIssuesWithGuardedRewrites(issues, draft);

  return {
    issues: enrichedIssues,
    metrics,
  };
}


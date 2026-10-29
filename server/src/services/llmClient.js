import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';

/**
 * Strips code fences and trims markdown artifacts to isolate JSON strings.
 */
export function extractJsonFromText(text) {
  if (!text) return '';
  let trimmed = text.trim();

  // Remove surrounding markdown fences if present.
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) {
    trimmed = fenceMatch[1].trim();
  } else {
    const innerFence = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (innerFence) {
      trimmed = innerFence[1].trim();
    }
  }

  // Find the first '{' that starts a JSON object.
  const startIdx = trimmed.indexOf('{');
  if (startIdx === -1) return '';

  // Walk the string, counting braces, to locate the matching closing '}'.
  let depth = 0;
  let endIdx = -1;
  for (let i = startIdx; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    if (depth === 0) {
      endIdx = i + 1; // include closing brace
      break;
    }
  }

  if (endIdx === -1) {
    // Fallback: slice from first to last brace if unbalanced.
    const lastBrace = trimmed.lastIndexOf('}');
    if (lastBrace !== -1) return trimmed.slice(startIdx, lastBrace + 1);
    return '';
  }

  return trimmed.slice(startIdx, endIdx);
}

/**
 * Parses JSON with automatic repair heuristics for common LLM syntax slips
 * (missing opening quote on keys, trailing commas).
 */
export function parseAndRepairJson(rawText) {
  const jsonStr = extractJsonFromText(rawText);
  if (!jsonStr) throw new SyntaxError('No JSON object found in LLM output');

  try {
    return JSON.parse(jsonStr);
  } catch (err1) {
    // Attempt standard repairs
    let repaired = jsonStr
      // Fix missing opening quote on property keys: e.g. \n  key": -> \n  "key":
      .replace(/([{\s,])([a-zA-Z0-9_]+)":/g, '$1"$2":')
      // Fix unquoted property keys: e.g. \n  key: -> \n  "key":
      .replace(/([{\s,])([a-zA-Z0-9_]+):(\s*["{\[\d\-tfn])/g, '$1"$2":$3')
      // Remove trailing commas before } or ]
      .replace(/,(\s*[}\]])/g, '$1');

    try {
      return JSON.parse(repaired);
    } catch {
      throw err1; // throw original parse error with exact column/position
    }
  }
}

/**
 * Validates parsed LLM JSON against the expected Zod schema, attempting
 * safe shape coercions only if direct validation fails.
 *
 * For example:
 * - If the schema expects { rewrites: [...] } but the LLM returned a raw array [...], wrap it.
 * - If the schema expects { rewrites: [...] } but the LLM returned { suggestions: [...] }, map it.
 * - If the schema expects { sourceAnalyses: [...] } and the LLM returned { sourceAnalyses: [...] },
 *   direct validation succeeds and nothing is touched.
 */
export function validateWithCoercion(parsed, zodSchema) {
  // 1. Direct validation: Always try uncoerced first
  const directResult = zodSchema.safeParse(parsed);
  if (directResult.success) {
    return directResult.data;
  }

  // 2. If direct validation fails, try targeted coercions based on the shape of `parsed`
  if (Array.isArray(parsed)) {
    // If parsed is a top-level array, try wrapping it in known candidate keys
    for (const key of ['rewrites', 'sourceAnalyses', 'developments']) {
      const candidate = { [key]: parsed };
      const res = zodSchema.safeParse(candidate);
      if (res.success) return res.data;
    }
  }

  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    // Check for alternative keys for rewrites schema
    const rewriteKeyAliases = ['suggestions', 'results', 'edits', 'changes', 'replacements', 'rewrite'];
    for (const altKey of rewriteKeyAliases) {
      if (Array.isArray(parsed[altKey])) {
        const normalized = parsed[altKey].map((item) => ({
          issueId: item.issueId || item.issue_id || item.id || '',
          replacement: item.replacement || item.suggested_text || item.text || item.rewrite || '',
          rationale: item.rationale || item.reason || item.explanation || '',
        }));
        const res = zodSchema.safeParse({ rewrites: normalized });
        if (res.success) return res.data;
      }
    }

    // Single rewrite item returned instead of array
    if (parsed.issueId || parsed.issue_id || parsed.replacement) {
      const normalized = [{
        issueId: parsed.issueId || parsed.issue_id || parsed.id || '',
        replacement: parsed.replacement || parsed.suggested_text || parsed.text || '',
        rationale: parsed.rationale || parsed.reason || parsed.explanation || '',
      }];
      const res = zodSchema.safeParse({ rewrites: normalized });
      if (res.success) return res.data;
    }

    // Check for alternative keys for sourceAnalyses schema
    const sourceKeyAliases = ['sources', 'analyses', 'source_analyses'];
    for (const altKey of sourceKeyAliases) {
      if (Array.isArray(parsed[altKey])) {
        const res = zodSchema.safeParse({ sourceAnalyses: parsed[altKey] });
        if (res.success) return res.data;
      }
    }
  }

  // 3. If no coercion succeeded, re-run zodSchema.parse(parsed) so caller gets the exact ZodError
  return zodSchema.parse(parsed);
}

/**
 * Generates fixture data for LLM_MOCK mode.
 */
export function getMockResearchResponse(extractedSources) {
  const usableSources = extractedSources.filter((s) => s.status !== 'failed');
  const s1 = usableSources[0] || { id: 'src-1', title: 'Source 1', text: 'Anthropic announces Claude 3.5 Sonnet.' };
  const s2 = usableSources[1] || { id: 'src-2', title: 'Source 2', text: 'SWE-bench evaluation shows 49% score.' };
  const s3 = usableSources[2] || { id: 'src-3', title: 'Source 3', text: 'Enterprise deployment costs and context caching analysis.' };

  function findSnippet(text, fallback) {
    if (!text || text.length < 30) return fallback;
    const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 25 && s.length < 160);
    return sentences[0] || fallback;
  }

  const quote1 = findSnippet(s1.text, 'Anthropic announced Claude 3.5 Sonnet, demonstrating major benchmark advances across coding and reasoning.');
  const quote2 = findSnippet(s2.text, 'On the SWE-bench Verified coding benchmark, autonomous agent resolution rates climbed to unprecedented levels.');
  const quote3 = findSnippet(s3.text, 'Prompt caching reduces API inference costs by up to 90 percent for repetitive large context workloads.');

  const sourceAnalyses = [
    {
      sourceId: s1.id,
      summary: `${s1.title} details recent frontier model benchmarks and agentic coding capabilities. The author argues that evaluation on realistic coding tasks has outpaced synthetic benchmarks.`,
      claims: [
        {
          id: `${s1.id}-c1`,
          sourceId: s1.id,
          text: 'Frontier AI models are achieving step-function improvements in autonomous code generation and problem resolution.',
          type: 'fact',
          evidenceQuote: quote1,
        },
        {
          id: `${s1.id}-c2`,
          sourceId: s1.id,
          text: 'Developer tooling is transitioning from autocomplete suggestions to autonomous repository-level pull request workflows.',
          type: 'analysis',
          evidenceQuote: quote1,
        },
      ],
    },
    {
      sourceId: s2.id,
      summary: `${s2.title} provides independent benchmarking of coding agent performance on SWE-bench. It underscores both real engineering gains and persistent edge-case failures.`,
      claims: [
        {
          id: `${s2.id}-c1`,
          sourceId: s2.id,
          text: 'Autonomous agents can resolve complex multi-file GitHub issues on verified benchmarks without human intervention.',
          type: 'fact',
          evidenceQuote: quote2,
        },
        {
          id: `${s2.id}-c2`,
          sourceId: s2.id,
          text: 'Benchmark gains will rapidly commoditize junior developer tasks over the next 18 months.',
          type: 'speculation',
          evidenceQuote: quote2,
        },
      ],
    },
    {
      sourceId: s3.id,
      summary: `${s3.title} analyzes the unit economics of deploying agentic AI systems at production scale, highlighting context caching and token usage.`,
      claims: [
        {
          id: `${s3.id}-c1`,
          sourceId: s3.id,
          text: 'Context caching architectures reduce sustained agent execution costs by nearly an order of magnitude.',
          type: 'fact',
          evidenceQuote: quote3,
        },
        {
          id: `${s3.id}-c2`,
          sourceId: s3.id,
          text: 'Enterprises that fail to implement prompt caching will struggle to sustain margin viability with continuous agents.',
          type: 'analysis',
          evidenceQuote: quote3,
        },
      ],
    },
  ];

  const synthesis = {
    developments: [
      {
        id: 'dev-1',
        title: 'The Shift from Co-Pilots to Autonomous Repository Agents',
        whatHappened: 'Frontier models paired with prompt caching and tool-use harnesses now resolve multi-file engineering tasks autonomously at viable unit economics.',
        whyItMatters: {
          founders: 'Product defensibility shifts from shallow wrapper interfaces to proprietary evaluation harnesses and domain-specific agent loops.',
          builders: 'Engineers spend less time writing boilerplate and more time defining automated test suites, specifications, and architecture invariants.',
          operators: 'Software maintenance costs drop, but cloud inference budgets must be monitored against runaway looping agents.',
        },
        whoShouldCare: 'Engineering leaders, AI tooling founders, and CTOs evaluating developer productivity stacks.',
        evidenceClaimIds: [`${s1.id}-c1`, `${s2.id}-c1`, `${s3.id}-c1`],
        openUncertainties: [
          'How well do high SWE-bench scores translate to messy proprietary enterprise codebases with minimal documentation?',
          'Will context caching price cuts remain stable across cloud providers?',
        ],
      },
    ],
    tensions: {
      agreements: [
        'Autonomous agentic coding has surpassed basic autocomplete in practical problem solving.',
        'Production agent viability requires aggressive token and latency management.',
      ],
      conflicts: [
        'Divergence between vendor benchmark claims and real-world enterprise pull-request merge rates.',
      ],
      gaps: [
        'Lack of longitudinal data on technical debt introduced by AI-generated multi-file diffs.',
      ],
    },
    newsletterAngles: [
      {
        id: 'angle-1',
        headline: 'Why the Autonomous Coding Race Is Actually an Infrastructure Economics Battle',
        thesis: 'The bottleneck in AI software engineering is no longer raw model intelligence—it is context caching, tool latency, and regression test rigor.',
        whyNow: 'Recent frontier releases and 90% caching discounts make continuous agent loops financially viable for the first time.',
        supportingClaimIds: [`${s1.id}-c1`, `${s2.id}-c1`, `${s3.id}-c1`],
        counterpoint: 'Token costs are still non-trivial when loops fail repeatedly, and prompt caching introduces memory cache invalidation complexities.',
        practicalImplication: 'Audit your engineering stack: prioritize automated integration test coverage before deploying autonomous PR bots.',
      },
      {
        id: 'angle-2',
        headline: 'Beyond Autocomplete: The Architecture of Next-Gen AI Engineers',
        thesis: 'Developers who adapt from typing code to orchestrating multi-agent test harnesses will operate with 5x leverage.',
        whyNow: 'SWE-bench verified scores have crossed the threshold where production code fixes are genuinely reliable.',
        supportingClaimIds: [`${s1.id}-c2`, `${s2.id}-c1`],
        counterpoint: 'Junior engineers may miss out on foundational debugging intuition if code generation is prematurely automated.',
        practicalImplication: 'Establish clear guidelines for code review when pull requests are authored by automated agent workers.',
      },
    ],
    recommendedAngle: {
      angleId: 'angle-1',
      reasoning: 'Angle 1 directly addresses founders and engineering operators wrestling with cloud costs and real-world deployment trade-offs, delivering high signal beyond hype.',
    },
  };

  return { sourceAnalyses, synthesis };
}

/**
 * Universal structured LLM caller supporting Anthropic and Gemini providers,
 * with automatic retry on malformed JSON, Zod schema validation, and
 * exponential backoff for transient failures.
 */
export async function callLlmStructured({
  systemPrompt,
  userPrompt,
  zodSchema,
  taskDescription = 'LLM Task',
}) {
  const isMock = process.env.LLM_MOCK === 'true';

  if (isMock) {
    throw new Error('callLlmStructured called in mock mode without handler');
  }

  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey || apiKey === 'mock-key-for-local-dev' || apiKey.trim() === '') {
    const err = new Error('LLM API key is missing. Set LLM_API_KEY in your environment, or set LLM_MOCK=true to run with mock fixtures.');
    err.code = 'CONFIG_ERROR';
    err.status = 500;
    throw err;
  }

  const provider = (process.env.LLM_PROVIDER || 'anthropic').toLowerCase();
  let model = process.env.LLM_MODEL || (provider === 'gemini' ? 'gemini-2.5-flash' : 'claude-3-5-sonnet-20241022');

  let rawOutput = '';
  let attempt = 0;
  const maxAttempts = 3; // Up to 3 attempts with backoff

  while (attempt < maxAttempts) {
    attempt++;
    const currentPrompt = attempt === 1
      ? userPrompt
      : `${userPrompt}\n\nIMPORTANT: Your previous response failed JSON schema validation. Output ONLY strictly parseable JSON adhering to the required structure, with no markdown fences, no wrapping commentary, and verbatim quotes.`;

    try {
      if (provider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model,
          contents: currentPrompt,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        });

        rawOutput = response.text || '';

        if (!rawOutput) {
          console.warn(`[LLM Client] Gemini returned empty text for "${taskDescription}" (attempt ${attempt}/${maxAttempts}, model: ${model})`);
          throw new SyntaxError('Gemini returned empty response text');
        }
      } else {
        // Anthropic provider
        const anthropic = new Anthropic({ apiKey });
        const response = await anthropic.messages.create({
          model,
          max_tokens: 4096,
          temperature: 0.2,
          system: systemPrompt,
          messages: [{ role: 'user', content: currentPrompt }],
        });

        rawOutput = response.content
          .filter((c) => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
      }

      console.info(`[LLM Client] Raw output received for "${taskDescription}" (attempt ${attempt}, provider: ${provider}, model: ${model}, length: ${rawOutput.length})`);

      const parsed = parseAndRepairJson(rawOutput);

      let validated;
      try {
        validated = validateWithCoercion(parsed, zodSchema);
      } catch (zodErr) {
        // Log the actual parsed structure to aid debugging
        console.warn(`[LLM Client] Schema validation failed. Parsed keys: ${JSON.stringify(parsed && typeof parsed === 'object' ? Object.keys(parsed) : typeof parsed)}. Preview: ${rawOutput.slice(0, 400)}`);
        throw zodErr;
      }

      console.info(`[LLM Client] Successfully validated "${taskDescription}" on attempt ${attempt}`);
      return validated;
    } catch (err) {
      console.warn(`[LLM Client] Attempt ${attempt}/${maxAttempts} failed for "${taskDescription}" (provider: ${provider}, model: ${model}, stage: ${err.name || 'unknown'}): ${err.message}`);

      // Handle permanent API errors — do not retry these
      if (err.status === 401 || err.message?.includes('API_KEY_INVALID')) {
        const error = new Error('Invalid LLM API Key. Please verify LLM_API_KEY in your environment.');
        error.code = 'LLM_AUTH_ERROR';
        error.status = 401;
        throw error;
      }

      // Handle rate limits with exponential backoff
      if (err.status === 429 || err.status === 503 || err.message?.includes('RESOURCE_EXHAUSTED')) {
        if (attempt < maxAttempts) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
          console.warn(`[LLM Client] Rate limited. Backing off ${backoffMs}ms before retry ${attempt + 1}/${maxAttempts}`);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue;
        }
        const error = new Error('LLM rate limit or demand spike reached. Please wait a moment before retrying.');
        error.code = 'LLM_RATE_LIMIT';
        error.status = 429;
        throw error;
      }

      // If we haven't exhausted retries and it was a JSON/Schema error, retry with backoff
      if (attempt < maxAttempts && (err instanceof SyntaxError || err.name === 'ZodError')) {
        const backoffMs = Math.min(500 * Math.pow(2, attempt - 1), 4000);
        console.warn(`[LLM Client] JSON/Schema error. Backing off ${backoffMs}ms before retry ${attempt + 1}/${maxAttempts}`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      const structuredError = new Error(`LLM output generation failed: ${err.message}`);
      structuredError.code = 'LLM_GENERATION_ERROR';
      structuredError.status = 502;
      structuredError.details = {
        rawOutputPreview: rawOutput.slice(0, 300),
        attempt,
        provider,
        model,
        errorType: err.name || 'Error',
        validationError: err.name === 'ZodError' ? err.errors : err.message,
      };
      throw structuredError;
    }
  }

  throw new Error(`Failed after ${maxAttempts} attempts.`);
}

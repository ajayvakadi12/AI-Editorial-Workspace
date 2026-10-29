import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

process.env.LLM_MOCK = 'true';
import { validateUrlForSsrf, isPrivateOrRestrictedIp } from '../services/urlSafety.js';
import {
  normalizeTextForComparison,
  verifyQuoteAgainstSource,
  verifyAllClaims,
} from '../services/quoteVerifier.js';
import {
  researchRequestSchema,
  synthesisSchema,
  llmResearchStage1OutputSchema,
} from '../utils/schemas.js';
import { createApp } from '../app.js';

describe('SSRF Protection (urlSafety.js)', () => {
  it('blocks private IPv4 and loopback addresses', () => {
    expect(isPrivateOrRestrictedIp('127.0.0.1')).toBe(true);
    expect(isPrivateOrRestrictedIp('127.0.0.2')).toBe(true);
    expect(isPrivateOrRestrictedIp('10.0.0.1')).toBe(true);
    expect(isPrivateOrRestrictedIp('172.16.0.1')).toBe(true);
    expect(isPrivateOrRestrictedIp('172.31.255.255')).toBe(true);
    expect(isPrivateOrRestrictedIp('192.168.1.1')).toBe(true);
    expect(isPrivateOrRestrictedIp('169.254.169.254')).toBe(true); // AWS/cloud metadata
    expect(isPrivateOrRestrictedIp('0.0.0.0')).toBe(true);
  });

  it('blocks private and loopback IPv6 addresses', () => {
    expect(isPrivateOrRestrictedIp('::1')).toBe(true);
    expect(isPrivateOrRestrictedIp('fe80::1')).toBe(true);
    expect(isPrivateOrRestrictedIp('fc00::1')).toBe(true);
    expect(isPrivateOrRestrictedIp('::ffff:127.0.0.1')).toBe(true);
  });

  it('allows public IP addresses', () => {
    expect(isPrivateOrRestrictedIp('8.8.8.8')).toBe(false);
    expect(isPrivateOrRestrictedIp('1.1.1.1')).toBe(false);
    expect(isPrivateOrRestrictedIp('93.184.216.34')).toBe(false); // example.com
  });

  it('validates URLs and blocks dangerous protocols, credentials, and ports', async () => {
    // Non-http schemes
    const ftp = await validateUrlForSsrf('ftp://example.com/file');
    expect(ftp.valid).toBe(false);
    expect(ftp.error).toContain('Invalid protocol');

    const file = await validateUrlForSsrf('file:///etc/passwd');
    expect(file.valid).toBe(false);

    // Credentials in URL
    const creds = await validateUrlForSsrf('http://admin:secret@example.com');
    expect(creds.valid).toBe(false);
    expect(creds.error).toContain('embedded credentials');

    // Non-standard port
    const badPort = await validateUrlForSsrf('http://example.com:22');
    expect(badPort.valid).toBe(false);
    expect(badPort.error).toContain('Port');

    // Localhost hostnames
    const local = await validateUrlForSsrf('http://localhost:80');
    expect(local.valid).toBe(false);
    expect(local.error).toContain('blocked');

    const internal = await validateUrlForSsrf('http://service.local');
    expect(internal.valid).toBe(false);

    // Cloud metadata IP
    const metadata = await validateUrlForSsrf('http://169.254.169.254/latest/meta-data');
    expect(metadata.valid).toBe(false);
    expect(metadata.error).toContain('blocked');
  });
});

describe('Evidence Verification (quoteVerifier.js)', () => {
  const sourceText = `
    Anthropic announced Claude 3.5 Sonnet on Thursday, claiming major benchmark
    advances across reasoning, coding, and vision capabilities.
    According to the technical report, "the model demonstrates an unprecedented 49.2%
    solve rate on SWE-bench Verified," outperforming previous frontier systems.
  `;

  it('verifies exact quote matches', () => {
    const quote = 'Anthropic announced Claude 3.5 Sonnet on Thursday';
    const result = verifyQuoteAgainstSource(quote, sourceText);
    expect(result.verified).toBe(true);
    expect(result.confidence).toBe(1.0);
  });

  it('verifies quotes with normalized quotes, whitespace, and dashes', () => {
    // Smart quotes and collapsed newlines
    const quote = '“the model demonstrates an unprecedented 49.2% solve rate on SWE-bench Verified,”';
    const result = verifyQuoteAgainstSource(quote, sourceText);
    expect(result.verified).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it('verifies quotes with sliding window fuzzy matching for minor omissions', () => {
    const fuzzyQuote = 'model demonstrates an unprecedented 49.2% solve rate on SWE-bench';
    const result = verifyQuoteAgainstSource(fuzzyQuote, sourceText);
    expect(result.verified).toBe(true);
  });

  it('rejects fabricated or hallucinated quotes', () => {
    const fakeQuote = 'Claude 3.5 achieved 99% accuracy on mathematical Olympiad proofs without test-time compute.';
    const result = verifyQuoteAgainstSource(fakeQuote, sourceText);
    expect(result.verified).toBe(false);
    expect(result.matchMethod).toBe('none');
  });

  it('calculates per-source verification stats correctly', () => {
    const extractedSources = [
      { id: 'src-1', title: 'Source 1', text: sourceText, url: 'https://example.com/source1' },
    ];
    const sourceAnalyses = [
      {
        sourceId: 'src-1',
        summary: 'Test summary',
        claims: [
          {
            id: 'c1',
            text: 'Claude 3.5 Sonnet was announced on Thursday.',
            type: 'fact',
            evidenceQuote: 'Anthropic announced Claude 3.5 Sonnet on Thursday',
          },
          {
            id: 'c2',
            text: 'Fabricated claim.',
            type: 'fact',
            evidenceQuote: 'Completely fabricated quote never present in the text.',
          },
        ],
      },
    ];

    const { enrichedAnalyses, verificationStats } = verifyAllClaims(sourceAnalyses, extractedSources);
    expect(enrichedAnalyses[0].claims[0].verified).toBe(true);
    expect(enrichedAnalyses[0].claims[1].verified).toBe(false);
    expect(verificationStats['src-1'].totalClaims).toBe(2);
    expect(verificationStats['src-1'].verifiedClaims).toBe(1);
    expect(verificationStats['src-1'].verificationRate).toBe(50);
  });
});

describe('Zod Schemas Validation', () => {
  it('enforces min 3 and max 8 sources', () => {
    const twoSources = {
      sources: [
        { type: 'text', value: 'Source 1 text content here...' },
        { type: 'text', value: 'Source 2 text content here...' },
      ],
    };
    expect(() => researchRequestSchema.parse(twoSources)).toThrow('At least 3 sources are required');

    const nineSources = {
      sources: Array.from({ length: 9 }, (_, i) => ({ type: 'text', value: `Source ${i} content` })),
    };
    expect(() => researchRequestSchema.parse(nineSources)).toThrow('Maximum 8 sources allowed');
  });

  it('validates synthesis structure', () => {
    const validSynthesis = {
      developments: [
        {
          id: 'dev-1',
          title: 'Title',
          whatHappened: 'Happened',
          whyItMatters: { founders: 'F', builders: 'B', operators: 'O' },
          whoShouldCare: 'Founders',
          evidenceClaimIds: ['c1'],
          openUncertainties: ['Uncertainty 1'],
        },
      ],
      tensions: { agreements: ['A'], conflicts: ['C'], gaps: ['G'] },
      newsletterAngles: [
        {
          id: 'a1',
          headline: 'H1',
          thesis: 'T1',
          whyNow: 'W1',
          supportingClaimIds: ['c1'],
          counterpoint: 'CP1',
          practicalImplication: 'PI1',
        },
        {
          id: 'a2',
          headline: 'H2',
          thesis: 'T2',
          whyNow: 'W2',
          supportingClaimIds: ['c1'],
          counterpoint: 'CP2',
          practicalImplication: 'PI2',
        },
      ],
      recommendedAngle: { angleId: 'a1', reasoning: 'Reason' },
    };

    expect(() => synthesisSchema.parse(validSynthesis)).not.toThrow();
  });
});

describe('Integration: POST /api/research', () => {
  const app = createApp();

  it('rejects requests with fewer than 3 sources with HTTP 400', async () => {
    const res = await request(app)
      .post('/api/research')
      .send({
        sources: [
          { type: 'text', value: 'Source 1 content...' },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns structured research brief in mock mode with 3 valid sources', async () => {
    const res = await request(app)
      .post('/api/research')
      .send({
        sources: [
          {
            type: 'text',
            value: 'Anthropic announced Claude 3.5 Sonnet, demonstrating major benchmark advances across coding and reasoning. The model resolved 49% of SWE-bench Verified coding problems.',
            label: 'Anthropic Release Announcement',
          },
          {
            type: 'text',
            value: 'On the SWE-bench Verified coding benchmark, autonomous agent resolution rates climbed to unprecedented levels. Independent evaluations showed significant gains in multi-file diff resolution.',
            label: 'SWE-bench Benchmark Evaluation',
          },
          {
            type: 'text',
            value: 'Prompt caching reduces API inference costs by up to 90 percent for repetitive large context workloads. Early adopters report massive savings on agentic loops.',
            label: 'Cost Analysis of LLM Context Caching',
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.isMock).toBe(true);
    expect(res.body.sourceStatuses).toHaveLength(3);
    expect(res.body.sourceAnalyses).toHaveLength(3);
    expect(res.body.synthesis.newsletterAngles.length).toBeGreaterThanOrEqual(2);
    expect(res.body.synthesis.recommendedAngle).toBeDefined();

    // Verify claims are enriched with quote verification
    const firstClaim = res.body.allClaims[0];
    expect(firstClaim.evidenceQuote).toBeDefined();
    expect(typeof firstClaim.verified).toBe('boolean');
  });

  it('handles failed source extraction cleanly when usable sources drop below 3', async () => {
    const res = await request(app)
      .post('/api/research')
      .send({
        sources: [
          { type: 'text', value: 'Valid source 1 text that exceeds minimum length requirements for testing purposes.' },
          { type: 'text', value: 'Short' }, // Fails (<50 chars)
          { type: 'text', value: 'Tiny' },  // Fails (<50 chars)
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INSUFFICIENT_USABLE_SOURCES');
    expect(res.body.sourceStatuses).toHaveLength(3);
    expect(res.body.sourceStatuses.some((s) => s.status === 'failed')).toBe(true);
  });
});

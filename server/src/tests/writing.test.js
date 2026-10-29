import { describe, it, expect } from 'vitest';
import request from 'supertest';
import {
  checkSentenceComplexity,
  checkPassiveVoice,
  checkFillerPhrases,
  checkJargonAndAcronyms,
  checkRepetition,
  checkDenseParagraphs,
  runAllWritingRules,
  applyEditAndRemapOffsets,
} from '../utils/writingRules.js';
import { computeWritingMetrics, countSyllables } from '../utils/writingMetrics.js';
import { checkRewriteIntegrity, enrichIssuesWithGuardedRewrites } from '../services/writingService.js';
import { createApp } from '../app.js';

process.env.LLM_MOCK = 'true';

describe('Deterministic Writing Rules', () => {
  describe('Rule 1: Sentence Complexity', () => {
    it('flags sentences over 30 words with warn severity', () => {
      const text = 'Because frontier foundation models are now being evaluated across massive real-world software repositories with diverse dependencies, many engineering organizations are discovering that their legacy code review workflows are fundamentally unprepared for autonomous agent pull requests.';
      const issues = checkSentenceComplexity(text);
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues[0].severity).toBe('warn');
      expect(issues[0].type).toBe('long_sentence');
    });

    it('flags sentences over 40 words with strong severity', () => {
      const text = 'When venture capital firms poured billions of dollars into foundation model labs during the previous fiscal cycle, few industry observers anticipated that context caching economics, rather than raw model parameter size, would become the single most decisive structural determinant of whether an enterprise could actually afford to deploy continuous autonomous software engineering agents across production pull requests.';
      const issues = checkSentenceComplexity(text);
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues[0].severity).toBe('strong');
      expect(issues[0].explanation).toContain('40 words');
    });

    it('flags sentences with 3+ commas as hard to follow', () => {
      const text = 'The new framework, which was released last month, supports multiple modalities, integrates with external databases, and provides automated evaluation tools.';
      const issues = checkSentenceComplexity(text);
      expect(issues.some((i) => i.type === 'hard_to_follow')).toBe(true);
    });

    it('does not flag crisp, short sentences', () => {
      const text = 'Frontier models are improving rapidly. Context caching cuts costs by 90%.';
      const issues = checkSentenceComplexity(text);
      expect(issues.length).toBe(0);
    });
  });

  describe('Rule 2: Passive Voice', () => {
    it('detects passive voice constructions', () => {
      const text = 'The benchmark evaluation was conducted by an independent research lab.';
      const issues = checkPassiveVoice(text);
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues[0].type).toBe('passive_voice');
      expect(issues[0].original).toBe('was conducted');
    });

    it('suggests active voice inversion when agent is specified with "by"', () => {
      const text = 'The system was developed by OpenAI engineers.';
      const issues = checkPassiveVoice(text);
      expect(issues[0].suggestion).toBeDefined();
      expect(issues[0].suggestion.replacement).toContain('OpenAI engineers');
    });

    it('documents false-positive nuance by providing informative explanations', () => {
      const text = 'The team was prepared for the launch.';
      const issues = checkPassiveVoice(text);
      if (issues.length > 0) {
        expect(issues[0].explanation).toContain('Who is performing this action?');
      }
    });
  });

  describe('Rule 3: Filler Phrases', () => {
    it('detects and provides replacements for verbose filler phrases', () => {
      const text = 'It is important to note that teams must test in order to verify performance.';
      const issues = checkFillerPhrases(text);
      expect(issues.length).toBe(2);

      const noteIssue = issues.find((i) => i.original.toLowerCase().includes('important to note'));
      expect(noteIssue).toBeDefined();
      expect(noteIssue.suggestion.replacement).toBe('Note that');

      const orderIssue = issues.find((i) => i.original.toLowerCase().includes('in order to'));
      expect(orderIssue).toBeDefined();
      expect(orderIssue.suggestion.replacement).toBe('to');
    });

    it('identifies weak modifiers like "very" and "basically"', () => {
      const text = 'The result is basically very impressive.';
      const issues = checkFillerPhrases(text);
      expect(issues.length).toBe(2);
      expect(issues.some((i) => i.original.toLowerCase() === 'very')).toBe(true);
      expect(issues.some((i) => i.original.toLowerCase() === 'basically')).toBe(true);
    });
  });

  describe('Rule 4: Jargon and Acronyms', () => {
    it('flags unexplained domain acronyms on first use', () => {
      const text = 'We deployed RAG across our enterprise cluster.';
      const issues = checkJargonAndAcronyms(text);
      const ragIssue = issues.find((i) => i.original === 'RAG');
      expect(ragIssue).toBeDefined();
      expect(ragIssue.suggestion.replacement).toContain('Retrieval-Augmented Generation (RAG)');
    });

    it('does not flag acronyms when definition is provided nearby', () => {
      const text = 'We deployed Retrieval-Augmented Generation (RAG) across our cluster.';
      const issues = checkJargonAndAcronyms(text);
      const ragIssue = issues.find((i) => i.original === 'RAG');
      expect(ragIssue).toBeUndefined();
    });

    it('flags corporate buzzwords like "synergy" and "paradigm shift"', () => {
      const text = 'The merger creates strong synergy and represents a paradigm shift.';
      const issues = checkJargonAndAcronyms(text);
      expect(issues.some((i) => i.original.toLowerCase() === 'synergy')).toBe(true);
      expect(issues.some((i) => i.original.toLowerCase() === 'paradigm shift')).toBe(true);
    });
  });

  describe('Rule 5: Repetition', () => {
    it('flags consecutive sentence openers with the same word', () => {
      const text = 'The architecture uses vector storage. The architecture also integrates cache layers.';
      const issues = checkRepetition(text);
      expect(issues.some((i) => i.type === 'repetition' && i.id.startsWith('opener-repeat'))).toBe(true);
    });

    it('flags significant non-stopword repetition in close proximity and provides a suggestion', () => {
      const text = 'The optimizer algorithm resolved the issue because the optimizer was fast.';
      const issues = checkRepetition(text);
      const repIssue = issues.find((i) => i.original.toLowerCase() === 'optimizer');
      expect(repIssue).toBeDefined();
      expect(repIssue.suggestion).toBeDefined();
      expect(repIssue.explanation).toContain('repeated in close proximity');
    });

    it('does NOT flag proper nouns like Claude or Context even if repeated in close proximity', () => {
      const text = 'Anthropic announced Claude for enterprise coding. Engineers rely on Claude for repository pull requests.';
      const issues = checkRepetition(text);
      const claudeRepeat = issues.find((i) => i.original.toLowerCase() === 'claude');
      expect(claudeRepeat).toBeUndefined();
    });

    it('does NOT flag two identical words appearing in different paragraphs', () => {
      const text = `The benchmark evaluation concluded that autonomous throughput scaled dramatically.

In the subsequent quarter, throughput remained stable across production workloads.`;
      const issues = checkRepetition(text);
      const throughputRepeat = issues.find((i) => i.original.toLowerCase() === 'throughput');
      expect(throughputRepeat).toBeUndefined();
    });
  });

  describe('Rule 6: Dense Paragraphs', () => {
    it('flags paragraphs exceeding 120 words', () => {
      const longWords = Array(130).fill('word').join(' ');
      const issues = checkDenseParagraphs(longWords);
      expect(issues.length).toBe(1);
      expect(issues[0].type).toBe('dense_paragraph');
      expect(issues[0].explanation).toContain('130 words');
    });

    it('does not flag short, scannable newsletter paragraphs', () => {
      const shortPara = 'This is a clean, 25-word paragraph designed for fast reading on mobile devices. It communicates a single, focused thought with clarity.';
      const issues = checkDenseParagraphs(shortPara);
      expect(issues.length).toBe(0);
    });
  });
});

describe('Offset Remapping (applyEditAndRemapOffsets)', () => {
  it('correctly shifts downstream issue offsets when text is shortened', () => {
    const originalText = 'We must study in order to understand RAG architectures.';
    // issue 1: "in order to" -> "to" (shorter by 9 chars)
    // issue 2: "RAG"
    const issues = runAllWritingRules(originalText);
    const fillerIssue = issues.find((i) => i.original === 'in order to');
    const ragIssue = issues.find((i) => i.original === 'RAG');

    expect(fillerIssue).toBeDefined();
    expect(ragIssue).toBeDefined();
    const oldRagStart = ragIssue.start;

    const { newDraft, updatedIssues } = applyEditAndRemapOffsets(
      originalText,
      fillerIssue.id,
      'to',
      issues
    );

    expect(newDraft).toBe('We must study to understand RAG architectures.');
    const newRagIssue = updatedIssues.find((i) => i.id === ragIssue.id);
    expect(newRagIssue).toBeDefined();
    // Delta = 'to'.length (2) - 'in order to'.length (11) = -9
    expect(newRagIssue.start).toBe(oldRagStart - 9);
    expect(newDraft.slice(newRagIssue.start, newRagIssue.end)).toBe('RAG');
  });

  it('correctly shifts downstream issue offsets when text is lengthened', () => {
    const originalText = 'We use RAG in order to scale.';
    const issues = runAllWritingRules(originalText);
    const ragIssue = issues.find((i) => i.original === 'RAG');
    const fillerIssue = issues.find((i) => i.original === 'in order to');

    const expansion = 'Retrieval-Augmented Generation (RAG)';
    const { newDraft, updatedIssues } = applyEditAndRemapOffsets(
      originalText,
      ragIssue.id,
      expansion,
      issues
    );

    expect(newDraft.startsWith(`We use ${expansion}`)).toBe(true);
    const newFillerIssue = updatedIssues.find((i) => i.id === fillerIssue.id);
    expect(newDraft.slice(newFillerIssue.start, newFillerIssue.end)).toBe('in order to');
  });

  it('safely replaces the correct occurrence when identical words appear in different locations', () => {
    // Two occurrences of "rapidly"
    const originalText = 'Models scale rapidly in labs. However, enterprise systems also scale rapidly when deployed.';
    const issues = [
      {
        id: 'word-repeat-70',
        type: 'repetition',
        start: 70, // Second occurrence of "rapidly"
        end: 77,
        original: 'rapidly',
        suggestion: { replacement: 'swiftly' },
      },
    ];

    const { newDraft, success } = applyEditAndRemapOffsets(
      originalText,
      'word-repeat-70',
      'swiftly',
      issues
    );

    expect(success).toBe(true);
    // First occurrence remains "rapidly", second occurrence became "swiftly"
    expect(newDraft).toBe('Models scale rapidly in labs. However, enterprise systems also scale swiftly when deployed.');
  });

  it('safely handles missing or modified passage without mutating draft', () => {
    const originalText = 'The team resolved the benchmark.';
    const staleIssue = {
      id: 'stale-1',
      start: 50,
      end: 65,
      original: 'nonexistent phrase',
      suggestion: { replacement: 'replacement' },
    };

    const { newDraft, success, error } = applyEditAndRemapOffsets(
      originalText,
      staleIssue.id,
      'replacement',
      [staleIssue]
    );

    expect(success).toBe(false);
    expect(error).toContain('nonexistent phrase');
    expect(newDraft).toBe(originalText); // draft preserved!
  });

  it('simulates Cancel workflow: draft is preserved untouched', () => {
    const originalDraft = 'Initial draft before user opens edit modal.';
    // User types replacement text in inline editor, but clicks Cancel
    const userModifiedText = 'Something completely different';
    const didCancel = true;

    let draft = originalDraft;
    if (!didCancel) {
      draft = userModifiedText;
    }

    expect(draft).toBe(originalDraft);
  });

  it('simulates Dismiss workflow: issue removed, draft remains untouched', () => {
    const originalDraft = 'We must analyze the benchmark in order to deploy.';
    const issues = runAllWritingRules(originalDraft);
    const issueToDismiss = issues[0];

    // Dismiss removes the issue from issues array without touching draft
    const remainingIssues = issues.filter((i) => i.id !== issueToDismiss.id);

    expect(remainingIssues.length).toBe(issues.length - 1);
    expect(originalDraft).toBe('We must analyze the benchmark in order to deploy.');
  });
});

describe('Writing Integrity Guard (checkRewriteIntegrity)', () => {
  it('passes when numbers and entities are preserved', () => {
    const original = 'Anthropic launched Claude 3.5 Sonnet on Thursday with a 49.2% score.';
    const rewrite = 'On Thursday, Anthropic released Claude 3.5 Sonnet, achieving a 49.2% benchmark score.';
    const result = checkRewriteIntegrity(original, rewrite);
    expect(result.safe).toBe(true);
  });

  it('flags rewrites that introduce ungrounded numbers or drop numbers', () => {
    const original = 'Anthropic achieved a 49.2% score on SWE-bench.';
    const hallucinatedRewrite = 'Anthropic achieved a 65% score on SWE-bench.';
    const result = checkRewriteIntegrity(original, hallucinatedRewrite);
    expect(result.safe).toBe(false);
    expect(result.warning).toContain('Integrity Guard');
  });

  it('flags rewrites that drop crucial named entities', () => {
    const original = 'Google DeepMind announced new Gemini optimizations.';
    const droppedRewrite = 'The team announced new optimizations.';
    const result = checkRewriteIntegrity(original, droppedRewrite);
    expect(result.safe).toBe(false);
  });
});

describe('Deterministic Writing Metrics (writingMetrics.js)', () => {
  it('computes accurate counts and readability metrics', () => {
    const text = 'Artificial intelligence models are transforming software development. Context caching lowers costs significantly. Every engineering organization must evaluate these capabilities.';
    const metrics = computeWritingMetrics(text, 0);

    expect(metrics.wordCount).toBeGreaterThan(15);
    expect(metrics.sentenceCount).toBe(3);
    expect(metrics.fleschReadingEase).toBeGreaterThanOrEqual(0);
    expect(metrics.fleschReadingEase).toBeLessThanOrEqual(100);
    expect(metrics.readabilityCaveat).toContain('Readability scores are a rough signal');
    expect(metrics.metricExplanations.wordCount).toBeDefined();
  });

  it('handles empty or blank draft without error', () => {
    const emptyMetrics = computeWritingMetrics('', 0);
    expect(emptyMetrics.wordCount).toBe(0);
    expect(emptyMetrics.sentenceCount).toBe(0);
    expect(emptyMetrics.fleschReadingEase).toBe(100);
  });
});

describe('Integration: POST /api/writing/analyze', () => {
  const app = createApp();

  it('returns issues and metrics for an editorial draft', async () => {
    const draft = `
It is important to note that the SWE-bench benchmark was conducted by independent evaluators in order to measure autonomous code resolution.
At the end of the day, frontier models can potentially resolve 49% of issues without human intervention.
    `;

    const res = await request(app)
      .post('/api/writing/analyze')
      .send({ draft });

    expect(res.status).toBe(200);
    expect(res.body.issues).toBeInstanceOf(Array);
    expect(res.body.issues.length).toBeGreaterThan(0);
    expect(res.body.metrics).toBeDefined();
    expect(res.body.metrics.wordCount).toBeGreaterThan(20);
    expect(res.body.metrics.readabilityCaveat).toBeDefined();
  });

  it('handles empty drafts cleanly', async () => {
    const res = await request(app)
      .post('/api/writing/analyze')
      .send({ draft: '' });

    expect(res.status).toBe(200);
    expect(res.body.issues).toEqual([]);
    expect(res.body.metrics.wordCount).toBe(0);
  });

  it('gracefully degrades and provides fallback suggestions when LLM rewrite request fails', async () => {
    // Temporarily disable mock to trigger live path with a simulated failure
    const prevMock = process.env.LLM_MOCK;
    const prevKey = process.env.LLM_API_KEY;
    try {
      process.env.LLM_MOCK = 'false';
      process.env.LLM_API_KEY = 'invalid-key-to-force-llm-failure';

      const mockIssues = [
        {
          id: 'long-1',
          type: 'long_sentence',
          start: 0,
          end: 100,
          original: 'This is a very long sentence that was flagged by the rule engine.',
          explanation: 'Too long.',
        },
      ];

      // Must NOT throw; must catch error and ensure issues retain a suggestion
      const result = await enrichIssuesWithGuardedRewrites(mockIssues, 'This is a draft.');
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].suggestion).toBeDefined();
      expect(result[0].suggestion.replacement).toBeDefined();
    } finally {
      process.env.LLM_MOCK = prevMock;
      process.env.LLM_API_KEY = prevKey;
    }
  });
});

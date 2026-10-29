import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  extractJsonFromText,
  parseAndRepairJson,
  validateWithCoercion,
} from '../services/llmClient.js';
import { llmResearchStage1OutputSchema } from '../utils/schemas.js';

describe('LLM Client Helpers', () => {
  describe('extractJsonFromText', () => {
    it('extracts JSON enclosed in markdown code fences', () => {
      const input = '```json\n{"hello": "world"}\n```';
      expect(extractJsonFromText(input)).toBe('{"hello": "world"}');
    });

    it('extracts first balanced JSON object from surrounding text', () => {
      const input = 'Here is your analysis:\n{"key": "value"}\nHope this helps!';
      expect(extractJsonFromText(input)).toBe('{"key": "value"}');
    });

    it('returns empty string if no JSON is present', () => {
      expect(extractJsonFromText('No JSON here')).toBe('');
    });
  });

  describe('parseAndRepairJson', () => {
    it('parses valid JSON directly', () => {
      const res = parseAndRepairJson('{"a": 1, "b": "test"}');
      expect(res).toEqual({ a: 1, b: 'test' });
    });

    it('repairs trailing commas', () => {
      const res = parseAndRepairJson('{"a": 1, "b": [2, 3,],}');
      expect(res).toEqual({ a: 1, b: [2, 3] });
    });

    it('throws SyntaxError when input is completely unparseable', () => {
      expect(() => parseAndRepairJson('not json')).toThrow();
    });
  });

  describe('validateWithCoercion', () => {
    const rewriteSchema = z.object({
      rewrites: z.array(
        z.object({
          issueId: z.string(),
          replacement: z.string(),
          rationale: z.string(),
        })
      ),
    });

    it('preserves and validates Research Stage 1 sourceAnalyses without altering it', () => {
      const stage1Input = {
        sourceAnalyses: [
          {
            sourceId: 'src-1',
            summary: 'A valid research summary describing frontier models and benchmarks.',
            claims: [
              {
                id: 'src-1-c1',
                text: 'Autonomous agents resolve benchmark issues.',
                type: 'fact',
                evidenceQuote: 'Autonomous agents resolve benchmark issues.',
              },
            ],
          },
        ],
      };

      const result = validateWithCoercion(stage1Input, llmResearchStage1OutputSchema);
      expect(result).toBeDefined();
      expect(result.sourceAnalyses).toBeDefined();
      expect(result.sourceAnalyses[0].sourceId).toBe('src-1');
    });

    it('preserves valid rewrites schema directly', () => {
      const validRewrite = {
        rewrites: [
          { issueId: 'issue-1', replacement: 'swiftly', rationale: 'Avoids repetition' },
        ],
      };
      const result = validateWithCoercion(validRewrite, rewriteSchema);
      expect(result).toEqual(validRewrite);
    });

    it('coerces a raw top-level array into { rewrites: [...] }', () => {
      const rawArray = [
        { issueId: 'issue-2', replacement: 'quickly', rationale: 'Concise' },
      ];
      const result = validateWithCoercion(rawArray, rewriteSchema);
      expect(result).toEqual({ rewrites: rawArray });
    });

    it('coerces alternative key "suggestions" into { rewrites: [...] }', () => {
      const alternativeInput = {
        suggestions: [
          { issueId: 'issue-3', replacement: 'better', rationale: 'Clearer' },
        ],
      };
      const result = validateWithCoercion(alternativeInput, rewriteSchema);
      expect(result.rewrites).toHaveLength(1);
      expect(result.rewrites[0].replacement).toBe('better');
    });

    it('throws standard ZodError if shape cannot be reconciled', () => {
      const badInput = { invalidKey: 123 };
      expect(() => validateWithCoercion(badInput, rewriteSchema)).toThrow();
    });
  });
});


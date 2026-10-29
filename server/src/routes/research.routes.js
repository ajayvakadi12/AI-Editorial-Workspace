import express from 'express';
import { researchRequestSchema } from '../utils/schemas.js';
import { runResearchPipeline } from '../services/researchService.js';

const router = express.Router();

/**
 * POST /api/research
 * Accepts { sources: [ { type: "url" | "text", value: string, label?: string } ] }
 * Requires 3-8 sources.
 */
router.post('/', async (req, res, next) => {
  try {
    // 1. Zod input validation
    const parsed = researchRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0]?.message || 'Invalid request body format.',
          details: parsed.error.errors,
        },
      });
    }

    // 2. Execute pipeline
    const result = await runResearchPipeline(parsed.data.sources);

    // 3. Handle cases where insufficient sources passed extraction
    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        sourceStatuses: result.sourceStatuses,
      });
    }

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;


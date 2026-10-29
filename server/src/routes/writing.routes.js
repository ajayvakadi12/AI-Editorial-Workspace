import express from 'express';
import { writingAnalyzeRequestSchema } from '../utils/schemas.js';
import { analyzeDraft } from '../services/writingService.js';

const router = express.Router();

/**
 * POST /api/writing/analyze
 * Analyzes editorial draft for deterministic writing issues and computes metrics.
 */
router.post('/analyze', async (req, res, next) => {
  try {
    const parsed = writingAnalyzeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0]?.message || 'Invalid draft payload.',
          details: parsed.error.errors,
        },
      });
    }

    const { draft } = parsed.data;
    const result = await analyzeDraft(draft);

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;


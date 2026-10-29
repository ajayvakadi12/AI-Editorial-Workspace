import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import researchRouter from './routes/research.routes.js';
import writingRouter from './routes/writing.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);

  // Security & Body parsing
  const allowedOrigins = [
  'http://localhost:5173',
  'https://ai-editorial-workspace-rho.vercel.app',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.error('Blocked CORS origin:', origin);
    return callback(new Error(`CORS not allowed for this origin: ${origin}`));
  },
  credentials: true,
}));

  app.use(express.json({ limit: '2mb' }));

  // Basic rate limiting
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again after 15 minutes.',
      },
    },
  });
  app.use('/api/', apiLimiter);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'AI Editorial Workspace API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      llmProvider: process.env.LLM_PROVIDER || 'anthropic',
      mockMode: process.env.LLM_MOCK === 'true',
    });
  });

  // Research Pipeline Route
  app.use('/api/research', researchRouter);

  // Writing Pipeline Route
  app.use('/api/writing', writingRouter);

  // 404 handler
  app.use((req, res, next) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${req.method} ${req.path} not found.`,
      },
    });
  });

  // Centralized Error handler (Never expose stack traces or raw keys)
  app.use((err, req, res, next) => {
    console.error(`[API Error] ${err.name || 'Error'}: ${err.message}`);
    const statusCode = err.status || err.statusCode || 500;
    const code = err.code || 'INTERNAL_SERVER_ERROR';

    res.status(statusCode).json({
      error: {
        code,
        message: err.userMessage || err.message || 'An unexpected error occurred.',
        details: err.details || undefined,
      },
    });
  });

  return app;
}


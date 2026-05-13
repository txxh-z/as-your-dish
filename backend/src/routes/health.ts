import { Router } from 'express';
import { config } from '../config.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    ts: new Date().toISOString(),
    env: config.NODE_ENV,
    llmProvider: config.LLM_PROVIDER,
  });
});

export { router as healthRouter };

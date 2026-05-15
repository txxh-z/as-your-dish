import express from 'express';
import cors from 'cors';
import { attachUser } from './middleware/auth.js';
import { healthRouter } from './routes/health.js';
import { analyzeMenuRouter } from './routes/analyzeMenu.js';
import { authRouter } from './routes/auth.js';
import { profileRouter } from './routes/profile.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // CORS: dev allows the Vite dev server. production list set via env in phase 5.5.
  app.use(
    cors({
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(attachUser);

  app.use('/api', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/profile', profileRouter);
  // WHY: mount before errorHandler so route errors flow through it. The
  // multipart parser inside this router has its own size/count limits;
  // express.json above does not apply because Content-Type differs.
  app.use('/api/analyze-menu', analyzeMenuRouter);

  app.use(errorHandler);

  return app;
}

import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.js';
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

  app.use('/api', healthRouter);

  app.use(errorHandler);

  return app;
}

import express from 'express';
import cors from 'cors';
import { attachUser } from './middleware/auth.js';
import { healthRouter } from './routes/health.js';
import { analyzeMenuRouter } from './routes/analyzeMenu.js';
import { authRouter } from './routes/auth.js';
import { dishImageRouter } from './routes/dishImage.js';
import { historyRouter } from './routes/history.js';
import { profileRouter } from './routes/profile.js';
import { errorHandler } from './middleware/errorHandler.js';
import {
  DISH_IMAGE_STATIC_PREFIX,
  getDishImageCacheDir,
} from './services/imageSearch.js';

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
  app.use(
    DISH_IMAGE_STATIC_PREFIX,
    express.static(getDishImageCacheDir(), {
      immutable: true,
      maxAge: '30d',
    }),
  );

  app.use('/api', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/history', historyRouter);
  app.use('/api/dish-image', dishImageRouter);
  // WHY: mount before errorHandler so route errors flow through it. The
  // multipart parser inside this router has its own size/count limits;
  // express.json above does not apply because Content-Type differs.
  app.use('/api/analyze-menu', analyzeMenuRouter);

  app.use(errorHandler);

  return app;
}

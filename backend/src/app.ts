import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { getAllowedOrigins } from './config.js';
import { attachUser } from './middleware/auth.js';
import { healthRouter } from './routes/health.js';
import { analyzeMenuRouter } from './routes/analyzeMenu.js';
import { authRouter } from './routes/auth.js';
import { demoMenuRouter } from './routes/demoMenu.js';
import { dishImageRouter } from './routes/dishImage.js';
import { examplesRouter } from './routes/examples.js';
import { historyRouter } from './routes/history.js';
import { profileRouter } from './routes/profile.js';
import { errorHandler } from './middleware/errorHandler.js';
import {
  DISH_IMAGE_STATIC_PREFIX,
  getDishImageCacheDir,
} from './services/imageSearch.js';

export function createApp() {
  const app = express();
  const allowedOrigins = getAllowedOrigins();

  // WHY: don't advertise Express version in every response; reduces fingerprinting.
  app.disable('x-powered-by');

  // WHY: helmet sets a baseline of security response headers (HSTS,
  // X-Content-Type-Options, Referrer-Policy, etc.). CSP is disabled here
  // because this backend only serves JSON + static dish images that are
  // consumed by the Vercel frontend; CSP would belong on the document
  // host, not the API host. crossOriginResourcePolicy is relaxed so the
  // Vercel rewrite can fetch /dish-images from a different origin.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // CORS: allow credentialed browser requests only from configured frontend origins.
  app.use(
    cors({
      origin: allowedOrigins,
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
  app.use('/api/demo-menu', demoMenuRouter);
  app.use('/api/examples', examplesRouter);
  app.use('/api/dish-image', dishImageRouter);
  // WHY: mount before errorHandler so route errors flow through it. The
  // multipart parser inside this router has its own size/count limits;
  // express.json above does not apply because Content-Type differs.
  app.use('/api/analyze-menu', analyzeMenuRouter);

  app.use(errorHandler);

  return app;
}

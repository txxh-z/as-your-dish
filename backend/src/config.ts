import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

// WHY: README setup creates `menu-translator/.env`, while npm workspace
// scripts run the backend with cwd `backend/`. Load the nearest .env first,
// then fall back to the repo root without duplicating secrets.
const dotenvPath = [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../.env')].find(
  existsSync,
);
loadDotenv(dotenvPath ? { path: dotenvPath } : undefined);

// WHY: env validation happens once at startup, not scattered through the codebase.
// missing required vars should crash the process loudly, not silently degrade later.
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  LLM_PROVIDER: z.enum(['anthropic', 'openai', 'gemini']).default('anthropic'),
  LLM_MODEL: z.string().optional(),

  // phase 1 doesn't actually call any LLM; these are validated but not required to be present yet.
  // phase 2 will tighten this so the chosen provider's key must exist.
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),

  JWT_SECRET: z.string().optional(),
  UNSPLASH_ACCESS_KEY: z.string().optional(),

  // WHY: matches .env.example and the libsql client's expected scheme. The
  // `file:` prefix tells @libsql/client to use a local SQLite file rather
  // than connecting to a remote Turso. Path is cwd-relative; npm scripts
  // run from backend/, so dev.db lands at backend/dev.db.
  DATABASE_URL: z.string().default('file:./dev.db'),

  // Finite by default from phase 5.4 onward. Set to "Infinity" explicitly
  // for local stress testing or private development.
  MONTHLY_QUOTA_PER_USER: z.string().default('30'),
});

export type Env = z.infer<typeof EnvSchema>;

function loadConfig(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('Environment validation failed. Check .env against .env.example.');
  }
  return parsed.data;
}

export const config = loadConfig();

export function getMonthlyQuota(): number {
  return config.MONTHLY_QUOTA_PER_USER === 'Infinity'
    ? Number.POSITIVE_INFINITY
    : Number(config.MONTHLY_QUOTA_PER_USER);
}

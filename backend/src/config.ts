import { existsSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

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
  // Local development should stay on loopback. Fly.io needs 0.0.0.0 so its
  // proxy can reach the app inside the machine.
  HOST: z.string().optional(),

  LLM_PROVIDER: z
    .enum([
      'anthropic',
      'openai',
      'gemini',
      'qwen',
      'kimi',
      'glm',
      'doubao',
      'deepseek',
    ])
    .default('anthropic'),
  LLM_MODEL: z.string().optional(),

  // phase 1 doesn't actually call any LLM; these are validated but not required to be present yet.
  // phase 2 will tighten this so the chosen provider's key must exist.
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  QWEN_API_KEY: z.string().optional(),
  KIMI_API_KEY: z.string().optional(),
  GLM_API_KEY: z.string().optional(),
  DOUBAO_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),

  JWT_SECRET: z.string().optional(),
  UNSPLASH_ACCESS_KEY: z.string().optional(),

  // WHY: matches .env.example and the libsql client's expected scheme. The
  // `file:` prefix tells @libsql/client to use a local SQLite file rather
  // than connecting to a remote Turso. Relative local DB paths are normalized
  // against PROJECT_ROOT below so npm workspace cwd changes cannot create a
  // second database file.
  DATABASE_URL: z.string().default('file:./backend/dev.db'),

  // Finite by default from phase 5.4 onward. Set to "Infinity" explicitly
  // for local stress testing or private development.
  MONTHLY_QUOTA_PER_USER: z.string().default('30'),

  // Portfolio demo guard. Disabled locally unless explicitly enabled.
  DEMO_MODE: z.enum(['0', '1']).default('0'),

  // Comma-separated browser origins allowed to send credentialed requests.
  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:5173,http://127.0.0.1:5173'),
});

export type Env = z.infer<typeof EnvSchema>;

function normalizeDatabaseUrl(url: string): string {
  const localFilePrefix = 'file:';
  if (!url.startsWith(localFilePrefix)) {
    return url;
  }

  const dbPath = url.slice(localFilePrefix.length);
  if (isAbsolute(dbPath)) {
    return url;
  }

  return `${localFilePrefix}${resolve(PROJECT_ROOT, dbPath)}`;
}

function loadConfig(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('Environment validation failed. Check .env against .env.example.');
  }
  return {
    ...parsed.data,
    DATABASE_URL: normalizeDatabaseUrl(parsed.data.DATABASE_URL),
  };
}

export const config = loadConfig();

export function getMonthlyQuota(): number {
  return config.MONTHLY_QUOTA_PER_USER === 'Infinity'
    ? Number.POSITIVE_INFINITY
    : Number(config.MONTHLY_QUOTA_PER_USER);
}

export function getAllowedOrigins(): string[] {
  return config.ALLOWED_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function getListenHost(): string {
  return config.HOST ?? (config.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost');
}

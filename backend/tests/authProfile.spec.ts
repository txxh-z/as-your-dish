import { mkdtempSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/libsql/migrator';
import { afterEach, describe, expect, it, vi } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_FOLDER = join(__dirname, '..', 'src', 'db', 'migrations');

interface TestContext {
  baseUrl: string;
  server: Server;
  tempDir: string;
  close: () => Promise<void>;
}

let ctx: TestContext | undefined;

afterEach(async () => {
  await ctx?.close();
  ctx = undefined;
});

async function setupApp(
  options: {
    nodeEnv?: 'development' | 'production' | 'test';
    allowedOrigins?: string;
  } = {},
): Promise<TestContext> {
  const tempDir = mkdtempSync(join(tmpdir(), 'menu-translator-auth-test-'));
  process.env.NODE_ENV = options.nodeEnv ?? 'test';
  process.env.DATABASE_URL = `file:${join(tempDir, 'test.db')}`;
  process.env.LLM_PROVIDER = 'anthropic';
  process.env.ANTHROPIC_API_KEY = 'sk-ant-server-key-for-tests';
  process.env.JWT_SECRET = 'test-jwt-secret-with-enough-entropy';
  process.env.MONTHLY_QUOTA_PER_USER = 'Infinity';
  process.env.ALLOWED_ORIGINS =
    options.allowedOrigins ?? 'http://localhost:5173,http://127.0.0.1:5173';

  vi.resetModules();

  const { db } = await import('../src/db/client.js');
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  const { createApp } = await import('../src/app.js');

  const server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('test server did not bind to a TCP port');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    server,
    tempDir,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      vi.resetModules();
      rmSync(tempDir, { recursive: true, force: true });
    },
  };
}

async function jsonRequest(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    cookie?: string;
  } = {},
) {
  if (!ctx) throw new Error('missing test context');
  const res = await fetch(`${ctx.baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(options.cookie ? { cookie: options.cookie } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const body = (await res.json()) as Record<string, unknown>;
  const setCookie = res.headers.get('set-cookie') ?? undefined;
  return { res, body, setCookie };
}

function sessionCookie(setCookie: string | undefined): string {
  if (!setCookie) throw new Error('response did not set a cookie');
  return setCookie.split(';')[0];
}

describe('auth and profile routes', () => {
  it('registers, reads current user, updates profile, and logs out', async () => {
    ctx = await setupApp();

    const registered = await jsonRequest('/api/auth/register', {
      method: 'POST',
      body: { email: 'Traveler@Example.com', password: 'correct-password' },
    });
    expect(registered.res.status).toBe(201);
    expect(registered.body.user).toMatchObject({ email: 'traveler@example.com' });
    expect(registered.setCookie).toContain('SameSite=Lax');
    expect(registered.setCookie).not.toContain('Secure');
    const cookie = sessionCookie(registered.setCookie);

    const me = await jsonRequest('/api/auth/me', { cookie });
    expect(me.res.status).toBe(200);
    expect(me.body.user).toMatchObject({ email: 'traveler@example.com' });

    const emptyProfile = await jsonRequest('/api/profile', { cookie });
    expect(emptyProfile.res.status).toBe(200);
    expect(emptyProfile.body.profile).toEqual({
      allergens: [],
      dietary: [],
      avoidances: [],
      flavorPrefs: {},
    });

    const updated = await jsonRequest('/api/profile', {
      method: 'PUT',
      cookie,
      body: {
        allergens: ['shellfish', 'shellfish'],
        dietary: ['vegetarian'],
        avoidances: ['cilantro', 'cilantro'],
        flavorPrefs: { spicy_max: 1 },
      },
    });
    expect(updated.res.status).toBe(200);
    expect(updated.body.profile).toEqual({
      allergens: ['shellfish'],
      dietary: ['vegetarian'],
      avoidances: ['cilantro'],
      flavorPrefs: { spicy_max: 1 },
    });

    const logout = await jsonRequest('/api/auth/logout', {
      method: 'POST',
      cookie,
    });
    expect(logout.res.status).toBe(200);

    const unauthorized = await jsonRequest('/api/profile');
    expect(unauthorized.res.status).toBe(401);
    expect(unauthorized.body.error).toBe('unauthorized');
  });

  it('rejects duplicate registration and bad login credentials', async () => {
    ctx = await setupApp();

    const first = await jsonRequest('/api/auth/register', {
      method: 'POST',
      body: { email: 'dup@example.com', password: 'correct-password' },
    });
    expect(first.res.status).toBe(201);

    const duplicate = await jsonRequest('/api/auth/register', {
      method: 'POST',
      body: { email: 'DUP@example.com', password: 'correct-password' },
    });
    expect(duplicate.res.status).toBe(409);
    expect(duplicate.body.error).toBe('email_already_registered');

    const badLogin = await jsonRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'dup@example.com', password: 'wrong-password' },
    });
    expect(badLogin.res.status).toBe(401);
    expect(badLogin.body.error).toBe('invalid_credentials');
  });

  it('sets SameSite=None and Secure for cross-origin deploy cookies', async () => {
    ctx = await setupApp({
      nodeEnv: 'development',
      allowedOrigins:
        'http://localhost:5173,https://as-your-dish.vercel.app',
    });

    const registered = await jsonRequest('/api/auth/register', {
      method: 'POST',
      body: { email: 'cross-origin@example.com', password: 'correct-password' },
    });

    expect(registered.res.status).toBe(201);
    expect(registered.setCookie).toContain('SameSite=None');
    expect(registered.setCookie).toContain('Secure');
  });
});

import { mkdtempSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AnalyzeMenuResult } from '@as-your-dish/shared';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  AnalyzeOutcome,
  LLMProvider,
} from '../src/services/llm/provider.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_FOLDER = join(__dirname, '..', 'src', 'db', 'migrations');

interface TestContext {
  baseUrl: string;
  server: Server;
  tempDir: string;
  analyzeCalls: () => number;
  close: () => Promise<void>;
}

let ctx: TestContext | undefined;

afterEach(async () => {
  await ctx?.close();
  ctx = undefined;
});

function fixtureResult(): AnalyzeMenuResult {
  return {
    language_detected: 'ko',
    dishes: [
      {
        original_name: '새우전',
        translated_name: '韩式虾饼',
        description: '虾仁裹蛋液煎成的小饼，常作家常小菜。',
        ingredients: [{ name: 'prawn' }, { name: 'egg' }],
        allergens: [],
        dietary: [],
        flavor: {
          salty: 2,
          sour: 0,
          sweet: 1,
          bitter: 0,
          spicy: 0,
          umami: 3,
        },
        image_search_keywords: 'korean prawn pancake',
        confidence: 0.88,
      },
    ],
    warnings: [],
  };
}

function outcomeFor(): AnalyzeOutcome {
  return {
    result: fixtureResult(),
    usage: { inputTokens: 12, outputTokens: 34 },
    model: 'claude-sonnet-4-6',
    keySource: 'server',
    estimatedUsd: 0.000546,
  };
}

async function setupApp(): Promise<TestContext> {
  const tempDir = mkdtempSync(join(tmpdir(), 'menu-translator-history-test-'));
  process.env.DATABASE_URL = `file:${join(tempDir, 'test.db')}`;
  process.env.LLM_PROVIDER = 'anthropic';
  process.env.ANTHROPIC_API_KEY = 'sk-ant-server-key-for-tests';
  process.env.JWT_SECRET = 'test-jwt-secret-with-enough-entropy';
  process.env.MONTHLY_QUOTA_PER_USER = 'Infinity';

  vi.resetModules();

  let analyzeCalls = 0;
  const provider: LLMProvider = {
    name: 'anthropic',
    defaultModel: 'claude-sonnet-4-6',
    async analyze() {
      analyzeCalls += 1;
      return outcomeFor();
    },
  };

  vi.doMock('../src/services/llm/index.js', () => ({
    getLLMProvider: () => provider,
    _resetLLMProviderForTests: () => undefined,
  }));

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
    analyzeCalls: () => analyzeCalls,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      vi.doUnmock('../src/services/llm/index.js');
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
  return {
    status: res.status,
    body: (await res.json()) as Record<string, unknown>,
    cookie: res.headers.get('set-cookie')?.split(';')[0],
  };
}

async function register(email: string): Promise<string> {
  const res = await jsonRequest('/api/auth/register', {
    method: 'POST',
    body: { email, password: 'correct-password' },
  });
  expect(res.status).toBe(201);
  expect(res.cookie).toBeDefined();
  return res.cookie!;
}

async function postImage(content: string, cookie?: string) {
  if (!ctx) throw new Error('missing test context');
  const form = new FormData();
  form.append(
    'images',
    new Blob([Buffer.from(content)], { type: 'image/jpeg' }),
    'menu.jpg',
  );

  const headers: Record<string, string> = { 'x-requested-with': 'fetch' };
  if (cookie) headers.cookie = cookie;
  const res = await fetch(`${ctx.baseUrl}/api/analyze-menu`, {
    method: 'POST',
    headers,
    body: form,
  });
  return {
    status: res.status,
    body: (await res.json()) as Record<string, unknown>,
  };
}

describe('history routes', () => {
  it('requires login', async () => {
    ctx = await setupApp();

    const list = await jsonRequest('/api/history');
    expect(list.status).toBe(401);
    expect(list.body.error).toBe('unauthorized');
  });

  it('lists, opens, and clears the current user history', async () => {
    ctx = await setupApp();
    const cookie = await register('history@example.com');
    const otherCookie = await register('other-history@example.com');

    const analyzed = await postImage('history-image', cookie);
    expect(analyzed.status).toBe(200);
    const menuId = analyzed.body.menuId;
    expect(typeof menuId).toBe('string');

    const otherList = await jsonRequest('/api/history', { cookie: otherCookie });
    expect(otherList.status).toBe(200);
    expect(otherList.body.items).toEqual([]);

    const list = await jsonRequest('/api/history', { cookie });
    expect(list.status).toBe(200);
    expect(list.body.items).toEqual([
      expect.objectContaining({
        menuId,
        languageDetected: 'ko',
        dishesCount: 1,
        previewDishes: ['韩式虾饼'],
      }),
    ]);

    const detail = await jsonRequest(`/api/history/${menuId}`, { cookie });
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({
      cached: true,
      menuId,
      result: {
        language_detected: 'ko',
        dishes: [
          expect.objectContaining({
            translated_name: '韩式虾饼',
          }),
        ],
      },
    });

    const clear = await jsonRequest('/api/history', {
      method: 'DELETE',
      cookie,
    });
    expect(clear.status).toBe(200);
    expect(clear.body).toEqual({ deleted: 1 });

    const empty = await jsonRequest('/api/history', { cookie });
    expect(empty.status).toBe(200);
    expect(empty.body.items).toEqual([]);
  });

  it('claims an anonymous cache hit for a logged-in user history', async () => {
    ctx = await setupApp();

    const anonymous = await postImage('shared-image');
    expect(anonymous.status).toBe(200);
    expect(ctx.analyzeCalls()).toBe(1);

    const cookie = await register('claim-cache@example.com');
    const cached = await postImage('shared-image', cookie);
    expect(cached.status).toBe(200);
    expect(cached.body.cached).toBe(true);
    expect(cached.body.menuId).toBe(anonymous.body.menuId);
    expect(ctx.analyzeCalls()).toBe(1);

    const list = await jsonRequest('/api/history', { cookie });
    expect(list.status).toBe(200);
    expect(list.body.items).toEqual([
      expect.objectContaining({
        menuId: anonymous.body.menuId,
        dishesCount: 1,
      }),
    ]);
  });

  it('lets multiple users keep separate history entries for the same cached menu', async () => {
    ctx = await setupApp();
    const firstCookie = await register('same-menu-one@example.com');
    const secondCookie = await register('same-menu-two@example.com');

    const first = await postImage('same-menu-image', firstCookie);
    expect(first.status).toBe(200);

    const second = await postImage('same-menu-image', secondCookie);
    expect(second.status).toBe(200);
    expect(second.body.cached).toBe(true);
    expect(second.body.menuId).toBe(first.body.menuId);
    expect(ctx.analyzeCalls()).toBe(1);

    const firstList = await jsonRequest('/api/history', { cookie: firstCookie });
    const secondList = await jsonRequest('/api/history', { cookie: secondCookie });
    expect(firstList.body.items).toEqual([
      expect.objectContaining({ menuId: first.body.menuId }),
    ]);
    expect(secondList.body.items).toEqual([
      expect.objectContaining({ menuId: first.body.menuId }),
    ]);

    const cleared = await jsonRequest('/api/history', {
      method: 'DELETE',
      cookie: firstCookie,
    });
    expect(cleared.body).toEqual({ deleted: 1 });

    const firstAfterClear = await jsonRequest('/api/history', {
      cookie: firstCookie,
    });
    const secondAfterClear = await jsonRequest('/api/history', {
      cookie: secondCookie,
    });
    expect(firstAfterClear.body.items).toEqual([]);
    expect(secondAfterClear.body.items).toEqual([
      expect.objectContaining({ menuId: first.body.menuId }),
    ]);
  });
});

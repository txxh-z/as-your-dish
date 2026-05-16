import { mkdtempSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AnalyzeMenuResult } from '@as-your-dish/shared';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  AnalyzeOptions,
  AnalyzeOutcome,
  LLMProvider,
} from '../src/services/llm/provider.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_FOLDER = join(__dirname, '..', 'src', 'db', 'migrations');
const VALID_USER_KEY = `sk-ant-${'x'.repeat(40)}`;

interface TestContext {
  baseUrl: string;
  db: Awaited<typeof import('../src/db/client.js')>['db'];
  server: Server;
  tempDir: string;
  analyzeCalls: () => number;
  lastOptions: () => AnalyzeOptions | undefined;
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
        original_name: '김치찌개',
        translated_name: '韩式泡菜汤',
        description: '韩国家常泡菜炖汤，酸辣开胃，常配米饭食用。',
        ingredients: [{ name: '泡菜' }, { name: '猪肉' }, { name: '豆腐' }],
        allergens: ['soy'],
        dietary: [],
        flavor: {
          salty: 3,
          sour: 3,
          sweet: 1,
          bitter: 0,
          spicy: 3,
          umami: 4,
        },
        image_search_keywords: 'kimchi stew korean food',
        confidence: 0.94,
      },
    ],
    warnings: [],
  };
}

function outcomeFor(
  opts: AnalyzeOptions | undefined,
  result: AnalyzeMenuResult = fixtureResult(),
): AnalyzeOutcome {
  return {
    result,
    usage: { inputTokens: 12, outputTokens: 34 },
    model: 'claude-sonnet-4-6',
    keySource: opts?.apiKey ? 'user' : 'server',
    estimatedUsd: 0.000546,
  };
}

async function setupApp(
  options: { quota?: string; result?: AnalyzeMenuResult } = {},
): Promise<TestContext> {
  const tempDir = mkdtempSync(join(tmpdir(), 'menu-translator-test-'));
  process.env.DATABASE_URL = `file:${join(tempDir, 'test.db')}`;
  process.env.LLM_PROVIDER = 'anthropic';
  process.env.ANTHROPIC_API_KEY = 'sk-ant-server-key-for-tests';
  process.env.JWT_SECRET = 'test-jwt-secret-with-enough-entropy';
  process.env.MONTHLY_QUOTA_PER_USER = options.quota ?? 'Infinity';

  vi.resetModules();

  let analyzeCalls = 0;
  let lastOptions: AnalyzeOptions | undefined;
  const provider: LLMProvider = {
    name: 'anthropic',
    defaultModel: 'claude-sonnet-4-6',
    async analyze(_images, opts) {
      analyzeCalls += 1;
      lastOptions = opts;
      return outcomeFor(opts, options.result);
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
    db,
    server,
    tempDir,
    analyzeCalls: () => analyzeCalls,
    lastOptions: () => lastOptions,
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

async function postImage(
  baseUrl: string,
  content: string,
  headers?: Record<string, string>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const form = new FormData();
  form.append(
    'images',
    new Blob([Buffer.from(content)], { type: 'image/jpeg' }),
    'menu.jpg',
  );

  const res = await fetch(`${baseUrl}/api/analyze-menu`, {
    method: 'POST',
    headers: { 'x-requested-with': 'fetch', ...(headers ?? {}) },
    body: form,
  });

  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

async function jsonRequest(
  baseUrl: string,
  path: string,
  options: {
    method?: string;
    body?: unknown;
    cookie?: string;
  } = {},
) {
  const res = await fetch(`${baseUrl}${path}`, {
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

async function selectLlmCalls(db: TestContext['db']) {
  const { llmCalls } = await import('../src/db/schema.js');
  return db.select().from(llmCalls);
}

describe('POST /api/analyze-menu', () => {
  it('rejects requests missing the X-Requested-With CSRF guard header', async () => {
    ctx = await setupApp();

    const form = new FormData();
    form.append(
      'images',
      new Blob([Buffer.from('csrf-image')], { type: 'image/jpeg' }),
      'menu.jpg',
    );
    const res = await fetch(`${ctx.baseUrl}/api/analyze-menu`, {
      method: 'POST',
      body: form,
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe('missing_fetch_header');
    expect(ctx.analyzeCalls()).toBe(0);
  });

  it('persists a cache miss, then records a zero-token cache hit', async () => {
    ctx = await setupApp();

    const first = await postImage(ctx.baseUrl, 'same-image');
    expect(first.status).toBe(200);
    expect(first.body.cached).toBe(false);
    expect(first.body.usage).toEqual({ inputTokens: 12, outputTokens: 34 });

    const second = await postImage(ctx.baseUrl, 'same-image');
    expect(second.status).toBe(200);
    expect(second.body.cached).toBe(true);
    expect(second.body.menuId).toBe(first.body.menuId);
    expect('usage' in second.body).toBe(false);
    expect(ctx.analyzeCalls()).toBe(1);

    const rows = await selectLlmCalls(ctx.db);
    expect(rows).toHaveLength(2);

    const miss = rows.find((r) => !r.cacheHit);
    const hit = rows.find((r) => r.cacheHit);
    expect(miss).toMatchObject({
      inputTokens: 12,
      outputTokens: 34,
      keySource: 'server',
      cacheHit: false,
      status: 'ok',
      callType: 'analyze_menu',
    });
    expect(hit).toMatchObject({
      inputTokens: 0,
      outputTokens: 0,
      estimatedUsd: 0,
      keySource: 'server',
      cacheHit: true,
      status: 'ok',
      callType: 'analyze_menu',
    });
  });

  it('uses valid BYO keys and ignores invalid key formats', async () => {
    ctx = await setupApp();

    const valid = await postImage(ctx.baseUrl, 'valid-key-image', {
      'x-anthropic-key': VALID_USER_KEY,
    });
    expect(valid.status).toBe(200);
    expect(ctx.lastOptions()?.apiKey).toBe(VALID_USER_KEY);

    const invalid = await postImage(ctx.baseUrl, 'invalid-key-image', {
      'x-anthropic-key': 'abc',
    });
    expect(invalid.status).toBe(200);
    expect(ctx.lastOptions()?.apiKey).toBeUndefined();

    const rows = await selectLlmCalls(ctx.db);
    expect(rows.map((r) => r.keySource).sort()).toEqual(['server', 'user']);
  });

  it('blocks server-key cache misses when monthly quota is exhausted', async () => {
    ctx = await setupApp({ quota: '0' });

    const blocked = await postImage(ctx.baseUrl, 'quota-image');
    expect(blocked.status).toBe(402);
    expect(blocked.body).toMatchObject({
      error: 'quota_exceeded',
      action: 'use_your_own_key',
    });
    expect(ctx.analyzeCalls()).toBe(0);

    const allowedWithUserKey = await postImage(ctx.baseUrl, 'quota-image', {
      'x-anthropic-key': VALID_USER_KEY,
    });
    expect(allowedWithUserKey.status).toBe(200);
    expect(ctx.analyzeCalls()).toBe(1);
    expect(ctx.lastOptions()?.apiKey).toBe(VALID_USER_KEY);

    const rows = await selectLlmCalls(ctx.db);
    expect(rows.map((r) => r.status).sort()).toEqual(['ok', 'rate_limited']);
  });

  it('adds profile-specific safety hits for logged-in users', async () => {
    const result = fixtureResult();
    result.dishes[0] = {
      ...result.dishes[0],
      ingredients: [{ name: 'prawn paste' }],
      allergens: [],
      dietary: ['contains_pork'],
    };
    ctx = await setupApp({ result });

    const registered = await jsonRequest(ctx.baseUrl, '/api/auth/register', {
      method: 'POST',
      body: { email: 'profile-hit@example.com', password: 'correct-password' },
    });
    expect(registered.status).toBe(201);
    const cookie = registered.cookie;
    expect(cookie).toBeDefined();

    const profile = await jsonRequest(ctx.baseUrl, '/api/profile', {
      method: 'PUT',
      cookie,
      body: {
        allergens: ['shellfish'],
        dietary: ['vegetarian'],
        flavorPrefs: { spicy_max: 1 },
      },
    });
    expect(profile.status).toBe(200);

    const analyzed = await postImage(ctx.baseUrl, 'profile-hit-image', {
      cookie: cookie!,
    });
    expect(analyzed.status).toBe(200);

    const body = analyzed.body as {
      result: {
        dishes: Array<{
          allergens: string[];
          hits: unknown[];
          hitDietary: unknown[];
          warnings: string[];
        }>;
        warnings: string[];
      };
    };
    expect(body.result.dishes[0].allergens).toContain('shellfish');
    expect(body.result.dishes[0].hits).toEqual([
      { allergen: 'shellfish', evidence: ['prawn paste'] },
    ]);
    expect(body.result.dishes[0].hitDietary).toEqual([
      {
        preference: 'vegetarian',
        evidence: ['含猪肉'],
        reason: '含猪肉，不符合素食',
      },
    ]);
    expect(body.result.dishes[0].warnings[0]).toContain('贝类');
    expect(body.result.warnings[0]).toContain('贝类');
  });

  it('rate limits logged-in users independently by user id', async () => {
    ctx = await setupApp();
    const firstUser = await jsonRequest(ctx.baseUrl, '/api/auth/register', {
      method: 'POST',
      body: { email: 'rate-one@example.com', password: 'correct-password' },
    });
    const secondUser = await jsonRequest(ctx.baseUrl, '/api/auth/register', {
      method: 'POST',
      body: { email: 'rate-two@example.com', password: 'correct-password' },
    });
    expect(firstUser.cookie).toBeDefined();
    expect(secondUser.cookie).toBeDefined();

    for (let i = 0; i < 5; i += 1) {
      const allowed = await postImage(ctx.baseUrl, 'rate-limit-image', {
        cookie: firstUser.cookie!,
      });
      expect(allowed.status).toBe(200);
    }

    const blocked = await postImage(ctx.baseUrl, 'rate-limit-image', {
      cookie: firstUser.cookie!,
    });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBe('rate_limited');

    const otherUserAllowed = await postImage(ctx.baseUrl, 'rate-limit-image', {
      cookie: secondUser.cookie!,
    });
    expect(otherUserAllowed.status).toBe(200);
  });
});

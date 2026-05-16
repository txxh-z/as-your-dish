import { mkdtempSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AnalyzeMenuResult } from '@as-your-dish/shared';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { afterEach, describe, expect, it, vi } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_FOLDER = join(__dirname, '..', 'src', 'db', 'migrations');

interface TestContext {
  baseUrl: string;
  db: Awaited<typeof import('../src/db/client.js')>['db'];
  menusService: Awaited<typeof import('../src/services/menus.service.js')>['menusService'];
  server: Server;
  tempDir: string;
  close: () => Promise<void>;
}

let ctx: TestContext | undefined;

afterEach(async () => {
  await ctx?.close();
  ctx = undefined;
});

function fixtureResult(name = '韩式虾饼'): AnalyzeMenuResult {
  return {
    language_detected: 'ko',
    dishes: [
      {
        original_name: '새우전',
        translated_name: name,
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

async function setupApp(): Promise<TestContext> {
  const tempDir = mkdtempSync(join(tmpdir(), 'menu-translator-demo-menu-test-'));
  process.env.DATABASE_URL = `file:${join(tempDir, 'test.db')}`;
  process.env.LLM_PROVIDER = 'anthropic';
  process.env.ANTHROPIC_API_KEY = 'sk-ant-server-key-for-tests';
  process.env.JWT_SECRET = 'test-jwt-secret-with-enough-entropy';
  process.env.MONTHLY_QUOTA_PER_USER = 'Infinity';

  vi.resetModules();

  const { db } = await import('../src/db/client.js');
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  const { menusService } = await import('../src/services/menus.service.js');
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
    menusService,
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

async function selectLlmCalls(db: TestContext['db']) {
  const { llmCalls } = await import('../src/db/schema.js');
  return db.select().from(llmCalls);
}

async function getJson(path: string) {
  if (!ctx) throw new Error('missing test context');
  const res = await fetch(`${ctx.baseUrl}${path}`);
  return {
    status: res.status,
    body: (await res.json()) as Record<string, unknown>,
  };
}

describe('demo menu service and routes', () => {
  it('lists example menus and returns service details by slug', async () => {
    ctx = await setupApp();
    await ctx.menusService.upsertExampleMenu({
      slug: 'korean-demo',
      imageHash: 'example-hash-1',
      result: fixtureResult('韩式虾饼'),
    });
    await ctx.menusService.upsertExampleMenu({
      slug: 'second-demo',
      imageHash: 'example-hash-2',
      result: fixtureResult('泡菜汤'),
    });

    const items = await ctx.menusService.listExampleMenus();
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      slug: 'korean-demo',
      languageDetected: 'ko',
      dishesCount: 1,
      previewDishes: ['韩式虾饼'],
      coverImagePath: '/api/examples/korean-demo.jpg',
    });

    const detail = await ctx.menusService.findExampleBySlug('korean-demo');
    expect(detail?.result.dishes[0].translated_name).toBe('韩式虾饼');
    await expect(ctx.menusService.findExampleBySlug('missing')).resolves.toBeNull();
  });

  it('serves demo menu list and detail without recording llm calls', async () => {
    ctx = await setupApp();
    const saved = await ctx.menusService.upsertExampleMenu({
      slug: 'korean-demo',
      imageHash: 'example-hash-1',
      result: fixtureResult(),
    });

    await expect(selectLlmCalls(ctx.db)).resolves.toHaveLength(0);

    const list = await getJson('/api/demo-menu');
    expect(list.status).toBe(200);
    expect(list.body.items).toEqual([
      expect.objectContaining({
        menuId: saved.menuId,
        slug: 'korean-demo',
        languageDetected: 'ko',
        dishesCount: 1,
        previewDishes: ['韩式虾饼'],
        coverImagePath: '/api/examples/korean-demo.jpg',
      }),
    ]);

    const detail = await getJson('/api/demo-menu/korean-demo');
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({
      cached: true,
      isExample: true,
      menuId: saved.menuId,
      result: {
        language_detected: 'ko',
        dishes: [
          expect.objectContaining({
            translated_name: '韩式虾饼',
            allergens: ['shellfish', 'eggs'],
          }),
        ],
      },
    });

    const missing = await getJson('/api/demo-menu/not-found');
    expect(missing.status).toBe(404);
    expect(missing.body.error).toBe('demo_menu_not_found');

    await expect(selectLlmCalls(ctx.db)).resolves.toHaveLength(0);
  });
});

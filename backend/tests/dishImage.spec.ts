import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/libsql/migrator';
import { afterEach, describe, expect, it, vi } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_FOLDER = join(__dirname, '..', 'src', 'db', 'migrations');

interface TestContext {
  baseUrl: string;
  imageDir: string;
  server: Server;
  tempDir: string;
  close: () => Promise<void>;
}

let ctx: TestContext | undefined;

afterEach(async () => {
  await ctx?.close();
  ctx = undefined;
  vi.unstubAllGlobals();
});

async function setupApp(fetchMock: ReturnType<typeof vi.fn>): Promise<TestContext> {
  const tempDir = mkdtempSync(join(tmpdir(), 'menu-translator-image-test-'));
  const imageDir = join(tempDir, 'images');
  process.env.DATABASE_URL = `file:${join(tempDir, 'test.db')}`;
  process.env.DISH_IMAGE_CACHE_DIR = imageDir;
  process.env.LLM_PROVIDER = 'anthropic';
  process.env.ANTHROPIC_API_KEY = 'sk-ant-server-key-for-tests';
  process.env.UNSPLASH_ACCESS_KEY = 'test-unsplash-key';
  process.env.JWT_SECRET = 'test-jwt-secret-with-enough-entropy';
  process.env.MONTHLY_QUOTA_PER_USER = 'Infinity';

  vi.resetModules();
  vi.stubGlobal('fetch', fetchMock);

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
    imageDir,
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

describe('GET /api/dish-image', () => {
  it('downloads the first Unsplash result, serves it locally, then uses cache', async () => {
    const realFetch = globalThis.fetch.bind(globalThis);
    const fetchMock = vi.fn(async (input: unknown, init?: unknown) => {
      const url = String(input);
      if (url.startsWith('http://127.0.0.1:')) {
        return realFetch(input as RequestInfo | URL, init as RequestInit);
      }
      if (url.startsWith('https://api.unsplash.com/search/photos')) {
        return new Response(
          JSON.stringify({
            results: [
              {
                urls: { small: 'https://images.unsplash.com/test-photo.jpg' },
                links: {
                  download_location:
                    'https://api.unsplash.com/photos/test-photo/download',
                },
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      if (url === 'https://images.unsplash.com/test-photo.jpg') {
        return new Response('fake-image-bytes', { status: 200 });
      }
      if (url === 'https://api.unsplash.com/photos/test-photo/download') {
        return new Response('{}', { status: 200 });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    ctx = await setupApp(fetchMock);

    const first = await fetch(
      `${ctx.baseUrl}/api/dish-image?q=${encodeURIComponent('kimchi stew')}`,
    );
    expect(first.status).toBe(200);
    const firstBody = (await first.json()) as {
      url: string;
      cached: boolean;
      source: string;
    };
    expect(firstBody).toMatchObject({
      cached: false,
      source: 'unsplash',
    });
    expect(firstBody.url).toMatch(/^\/dish-images\/.+\.jpg$/);
    expect(existsSync(join(ctx.imageDir, basename(firstBody.url)))).toBe(true);
    expect(fetchMock.mock.calls.filter(([input]) => String(input).startsWith('https://'))).toHaveLength(3);

    const staticImage = await fetch(`${ctx.baseUrl}${firstBody.url}`);
    expect(staticImage.status).toBe(200);
    expect(await staticImage.text()).toBe('fake-image-bytes');

    const second = await fetch(
      `${ctx.baseUrl}/api/dish-image?q=${encodeURIComponent(' Kimchi   Stew ')}`,
    );
    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({
      url: firstBody.url,
      cached: true,
      source: 'cache',
    });
    expect(fetchMock.mock.calls.filter(([input]) => String(input).startsWith('https://'))).toHaveLength(3);
  });
});

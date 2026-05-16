import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/libsql/migrator';
import { afterEach, describe, expect, it, vi } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_FOLDER = join(__dirname, '..', 'src', 'db', 'migrations');

let tempDir: string | undefined;

afterEach(() => {
  vi.resetModules();
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  tempDir = undefined;
});

describe('seed examples dry-run', () => {
  it('upserts fixture results without calling an LLM provider', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'menu-translator-seed-test-'));
    const imageDir = join(tempDir, 'examples');
    mkdirSync(imageDir);
    const imagePath = join(imageDir, 'dry-run.jpg');
    writeFileSync(imagePath, Buffer.from('fake image bytes'));

    process.env.DATABASE_URL = `file:${join(tempDir, 'test.db')}`;
    process.env.LLM_PROVIDER = 'anthropic';
    process.env.MONTHLY_QUOTA_PER_USER = 'Infinity';
    delete process.env.ANTHROPIC_API_KEY;

    vi.resetModules();
    const { db } = await import('../src/db/client.js');
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    const { runSeedExamples } = await import('../scripts/seed-examples.js');
    const { menusService } = await import('../src/services/menus.service.js');

    await runSeedExamples({
      dryRun: true,
      examples: [
        {
          slug: 'dry-run',
          displayName: 'Dry Run',
          imagePath,
        },
      ],
    });
    await runSeedExamples({
      dryRun: true,
      examples: [
        {
          slug: 'dry-run',
          displayName: 'Dry Run',
          imagePath,
        },
      ],
    });

    const examples = await menusService.listExampleMenus();
    expect(examples).toHaveLength(1);
    expect(examples[0]).toMatchObject({
      slug: 'dry-run',
      dishesCount: 1,
      previewDishes: ['Dry Run招牌菜'],
    });
  });
});

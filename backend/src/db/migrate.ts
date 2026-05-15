import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/libsql/migrator';

import { db } from './client.js';

// WHY: run-once script invoked via `npm run db:migrate -w backend`. Idempotent
// — drizzle records applied migrations in its own __drizzle_migrations table,
// so re-running is a no-op when the DB is already up to date.
const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = join(__dirname, 'migrations');

await migrate(db, { migrationsFolder });
console.log(`migrations applied from ${migrationsFolder}`);
process.exit(0);

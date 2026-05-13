import { defineConfig } from 'drizzle-kit';

// WHY: schema.ts lands in phase 2 (TODO §2.3). Config is in place now so
// drizzle-kit generate/push commands work without further setup later.
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'file:./dev.db',
  },
});

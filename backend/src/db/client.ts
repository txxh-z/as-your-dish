import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { config } from '../config.js';

// WHY: a single libsql client instance, exported as a Drizzle wrapper, is
// shared by every service. Per-request DB clients would multiply socket /
// file-handle overhead with no benefit since libsql's local-file mode is
// already synchronous-ish.
const client = createClient({ url: config.DATABASE_URL });
export const db = drizzle(client);

import { randomUUID } from 'node:crypto';

import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

import { config } from '../config.js';
import { db } from '../db/client.js';
import { profiles, users } from '../db/schema.js';

export interface PublicUser {
  id: string;
  email: string;
}

interface SessionPayload {
  sub: string;
  email: string;
}

const PASSWORD_COST = 12;
const SESSION_EXPIRES_IN = '30d';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getJwtSecret(): string {
  if (!config.JWT_SECRET) {
    throw new Error('JWT_SECRET is required for auth routes.');
  }
  return config.JWT_SECRET;
}

function toPublicUser(row: typeof users.$inferSelect): PublicUser {
  return { id: row.id, email: row.email };
}

export async function registerUser(
  email: string,
  password: string,
): Promise<PublicUser> {
  const normalizedEmail = normalizeEmail(email);
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    throw new AuthConflictError('email_already_registered');
  }

  const id = randomUUID();
  const passwordHash = await bcrypt.hash(password, PASSWORD_COST);

  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id,
      email: normalizedEmail,
      passwordHash,
    });
    await tx.insert(profiles).values({ userId: id });
  });

  return { id, email: normalizedEmail };
}

export async function loginUser(
  email: string,
  password: string,
): Promise<PublicUser> {
  const user = await findUserByEmail(normalizeEmail(email));
  if (!user) {
    throw new AuthInvalidCredentialsError();
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw new AuthInvalidCredentialsError();
  }

  return toPublicUser(user);
}

export async function findUserById(id: string): Promise<PublicUser | null> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  const user = rows[0];
  return user ? toPublicUser(user) : null;
}

export function signSession(user: PublicUser): string {
  return jwt.sign({ sub: user.id, email: user.email }, getJwtSecret(), {
    expiresIn: SESSION_EXPIRES_IN,
  });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const payload = jwt.verify(token, getJwtSecret());
    if (
      typeof payload === 'object' &&
      typeof payload.sub === 'string' &&
      typeof payload.email === 'string'
    ) {
      return { sub: payload.sub, email: payload.email };
    }
    return null;
  } catch {
    return null;
  }
}

async function findUserByEmail(
  email: string,
): Promise<typeof users.$inferSelect | null> {
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return rows[0] ?? null;
}

export class AuthConflictError extends Error {
  constructor(readonly code: 'email_already_registered') {
    super(code);
  }
}

export class AuthInvalidCredentialsError extends Error {
  constructor() {
    super('invalid_credentials');
  }
}

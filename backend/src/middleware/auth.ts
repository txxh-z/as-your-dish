import type { Request, RequestHandler } from 'express';

import { HttpError } from './errorHandler.js';
import { findUserById, verifySession, type PublicUser } from '../services/auth.js';

export const SESSION_COOKIE = 'ayd_session';

declare global {
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').flatMap((part) => {
      const index = part.indexOf('=');
      if (index === -1) return [];
      const key = part.slice(0, index).trim();
      const value = part.slice(index + 1).trim();
      return [[key, decodeURIComponent(value)]];
    }),
  );
}

export function getSessionToken(req: Request): string | undefined {
  return parseCookies(req.headers.cookie)[SESSION_COOKIE];
}

export const attachUser: RequestHandler = async (req, _res, next) => {
  try {
    const token = getSessionToken(req);
    if (!token) {
      next();
      return;
    }

    const payload = verifySession(token);
    if (!payload) {
      next();
      return;
    }

    const user = await findUserById(payload.sub);
    if (user) req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

export const requireUser: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    next(new HttpError(401, 'unauthorized', '请先登录。'));
    return;
  }
  next();
};

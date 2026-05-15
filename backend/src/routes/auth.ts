import { Router } from 'express';
import type { Response } from 'express';
import { z } from 'zod';

import { config } from '../config.js';
import { SESSION_COOKIE } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';
import {
  AuthConflictError,
  AuthInvalidCredentialsError,
  loginUser,
  registerUser,
  signSession,
  type PublicUser,
} from '../services/auth.js';

const AuthBody = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
});

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: config.NODE_ENV === 'production',
  path: '/',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

function setSessionCookie(res: Response, user: PublicUser) {
  res.cookie(SESSION_COOKIE, signSession(user), cookieOptions);
}

function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

function parseAuthBody(body: unknown) {
  const parsed = AuthBody.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(400, 'invalid_auth_body', '邮箱或密码格式不正确。');
  }
  return parsed.data;
}

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const body = parseAuthBody(req.body);
    const user = await registerUser(body.email, body.password);
    setSessionCookie(res, user);
    res.status(201).json({ user });
  } catch (err) {
    if (err instanceof AuthConflictError) {
      next(new HttpError(409, err.code, '该邮箱已注册。'));
      return;
    }
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const body = parseAuthBody(req.body);
    const user = await loginUser(body.email, body.password);
    setSessionCookie(res, user);
    res.json({ user });
  } catch (err) {
    if (err instanceof AuthInvalidCredentialsError) {
      next(new HttpError(401, 'invalid_credentials', '邮箱或密码错误。'));
      return;
    }
    next(err);
  }
});

router.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  res.json({ user: req.user ?? null });
});

export { router as authRouter };

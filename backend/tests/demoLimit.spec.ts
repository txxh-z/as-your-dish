import type { Request, RequestHandler, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { createDailyAnonymousDemoLimit } from '../src/middleware/demoLimit.js';

interface InvocationOptions {
  ip?: string;
  userId?: string | null;
  keySource?: 'server' | 'user';
}

interface InvocationResult {
  next: ReturnType<typeof vi.fn>;
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
}

function createMiddleware(options: {
  enabled: boolean;
  now?: () => Date;
}): RequestHandler {
  return createDailyAnonymousDemoLimit({
    isEnabled: () => options.enabled,
    now: options.now,
  });
}

function invoke(
  middleware: RequestHandler,
  {
    ip = '203.0.113.10',
    userId = null,
    keySource = 'server',
  }: InvocationOptions = {},
): InvocationResult {
  const req = { ip } as Request;
  const next = vi.fn();
  const status = vi.fn();
  const json = vi.fn();
  const res = {
    locals: {
      analyzeMenu: {
        userId,
        keySource,
      },
    },
    status(code: number) {
      status(code);
      return this;
    },
    json(body: unknown) {
      json(body);
      return this;
    },
  } as unknown as Response;

  middleware(req, res, next);
  return { next, status, json };
}

describe('dailyAnonymousDemoLimit', () => {
  it('blocks the fourth anonymous server-key cache miss in demo mode', () => {
    const middleware = createMiddleware({ enabled: true });

    for (let i = 0; i < 3; i += 1) {
      const allowed = invoke(middleware);
      expect(allowed.next).toHaveBeenCalledTimes(1);
      expect(allowed.status).not.toHaveBeenCalled();
      expect(allowed.json).not.toHaveBeenCalled();
    }

    const blocked = invoke(middleware);
    expect(blocked.next).not.toHaveBeenCalled();
    expect(blocked.status).toHaveBeenCalledWith(402);
    expect(blocked.json).toHaveBeenCalledWith({
      error: 'demo_limit_exceeded',
      action: 'register_or_use_your_own_key',
      message: 'Demo 匿名额度已用完，请注册账号或填入自己的 API key 继续使用。',
    });
  });

  it('is a no-op when demo mode is disabled', () => {
    const middleware = createMiddleware({ enabled: false });

    for (let i = 0; i < 6; i += 1) {
      const allowed = invoke(middleware);
      expect(allowed.next).toHaveBeenCalledTimes(1);
      expect(allowed.status).not.toHaveBeenCalled();
    }
  });

  it('is a no-op for logged-in users', () => {
    const middleware = createMiddleware({ enabled: true });

    for (let i = 0; i < 6; i += 1) {
      const allowed = invoke(middleware, { userId: 'user_123' });
      expect(allowed.next).toHaveBeenCalledTimes(1);
      expect(allowed.status).not.toHaveBeenCalled();
    }
  });

  it('is a no-op for user-key requests', () => {
    const middleware = createMiddleware({ enabled: true });

    for (let i = 0; i < 6; i += 1) {
      const allowed = invoke(middleware, { keySource: 'user' });
      expect(allowed.next).toHaveBeenCalledTimes(1);
      expect(allowed.status).not.toHaveBeenCalled();
    }
  });

  it('resets the same anonymous IP on the next UTC day', () => {
    let currentDate = new Date('2026-05-16T23:55:00.000Z');
    const middleware = createMiddleware({
      enabled: true,
      now: () => currentDate,
    });

    for (let i = 0; i < 3; i += 1) {
      expect(invoke(middleware).next).toHaveBeenCalledTimes(1);
    }

    const blocked = invoke(middleware);
    expect(blocked.status).toHaveBeenCalledWith(402);

    currentDate = new Date('2026-05-17T00:01:00.000Z');
    const allowedNextDay = invoke(middleware);
    expect(allowedNextDay.next).toHaveBeenCalledTimes(1);
    expect(allowedNextDay.status).not.toHaveBeenCalled();
  });
});

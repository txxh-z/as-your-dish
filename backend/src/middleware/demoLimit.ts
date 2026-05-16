import type { RequestHandler } from 'express';
import { ipKeyGenerator } from 'express-rate-limit';

import { config } from '../config.js';

// WHY: in-memory map = single-process truth. Adequate for portfolio demo
// with single Fly.io instance. For multi-instance deploy, migrate to a
// db-backed counter (e.g. SQLite table `demo_call_log` keyed by ip + day).
// Single instance avoids race conditions between instances.
const anonymousDemoCalls = new Map<string, { day: string; count: number }>();

const DAILY_ANONYMOUS_DEMO_LIMIT = 3;

type DemoCallStore = Map<string, { day: string; count: number }>;

interface AnalyzeMenuQuotaContext {
  userId: string | null;
  keySource: 'server' | 'user';
}

interface DailyAnonymousDemoLimitOptions {
  isEnabled?: () => boolean;
  now?: () => Date;
  store?: DemoCallStore;
}

function utcDayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function prunePreviousDays(store: DemoCallStore, day: string): void {
  for (const [key, entry] of store) {
    if (entry.day !== day) store.delete(key);
  }
}

function getClientKey(ip: string | undefined): string {
  return ipKeyGenerator(ip ?? 'unknown');
}

export function createDailyAnonymousDemoLimit({
  isEnabled = () => config.DEMO_MODE === '1',
  now = () => new Date(),
  store = new Map(),
}: DailyAnonymousDemoLimitOptions = {}): RequestHandler {
  return (req, res, next) => {
    if (!isEnabled()) {
      next();
      return;
    }

    const ctx = res.locals.analyzeMenu as AnalyzeMenuQuotaContext | undefined;
    if (!ctx || ctx.userId || ctx.keySource === 'user') {
      next();
      return;
    }

    const day = utcDayKey(now());
    prunePreviousDays(store, day);

    const key = getClientKey(req.ip);
    const current = store.get(key);
    const entry = current?.day === day ? current : { day, count: 0 };

    if (entry.count >= DAILY_ANONYMOUS_DEMO_LIMIT) {
      res.status(402).json({
        error: 'demo_limit_exceeded',
        action: 'register_or_use_your_own_key',
        message: 'Demo 匿名额度已用完，请注册账号或填入自己的 API key 继续使用。',
      });
      return;
    }

    entry.count += 1;
    store.set(key, entry);
    next();
  };
}

export const dailyAnonymousDemoLimit = createDailyAnonymousDemoLimit({
  store: anonymousDemoCalls,
});

export function _resetDailyAnonymousDemoLimitForTests(): void {
  anonymousDemoCalls.clear();
}

import type { RequestHandler } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { and, eq, gte, isNull, sql } from 'drizzle-orm';

import { getMonthlyQuota } from '../config.js';
import { db } from '../db/client.js';
import { llmCalls } from '../db/schema.js';
import { recordCall } from '../services/llmAccounting.js';
import type { ProviderName } from '../services/llm/provider.js';

// WHY: memory store is acceptable for MVP / single-instance dev. Before
// phase 5.5 multi-instance deploy, swap in rate-limit-redis so per-IP
// counts are shared across processes — otherwise a malicious caller hops
// between instances and gets N × budget. The interface stays the same;
// only the store changes.
export const analyzeMenuRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  keyGenerator: (req) => {
    if (req.user?.id) return `user:${req.user.id}`;
    return `ip:${ipKeyGenerator(req.ip ?? 'unknown')}`;
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'rate_limited',
    message: '请求过于频繁，请稍等片刻再试。',
  },
});

interface MonthlyQuotaContext {
  userId?: string | null;
  keySource: 'server' | 'user';
  provider: { name: ProviderName; defaultModel: string };
}

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// L2 cost guard for server-key calls. BYO-key requests skip this because they
// bill to the user's provider account instead of the demo operator budget.
export const monthlyUserQuota: RequestHandler = async (_req, res, next) => {
  try {
    const quota = getMonthlyQuota();
    if (!Number.isFinite(quota)) {
      next();
      return;
    }

    const ctx = res.locals.analyzeMenu as MonthlyQuotaContext | undefined;
    if (!ctx || ctx.keySource === 'user') {
      next();
      return;
    }

    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(llmCalls)
      .where(
        and(
          eq(llmCalls.callType, 'analyze_menu'),
          eq(llmCalls.keySource, 'server'),
          eq(llmCalls.cacheHit, false),
          eq(llmCalls.status, 'ok'),
          ctx.userId ? eq(llmCalls.userId, ctx.userId) : isNull(llmCalls.userId),
          gte(llmCalls.createdAt, startOfCurrentMonth()),
        ),
      );

    const used = Number(row?.count ?? 0);
    if (used < quota) {
      next();
      return;
    }

    await recordCall({
      provider: ctx.provider.name,
      model: ctx.provider.defaultModel,
      inputTokens: 0,
      outputTokens: 0,
      estimatedUsd: 0,
      keySource: 'server',
      cacheHit: false,
      status: 'rate_limited',
      callType: 'analyze_menu',
      userId: ctx.userId ?? null,
    });

    res.status(402).json({
      error: 'quota_exceeded',
      action: 'use_your_own_key',
      message: '本月服务端免费额度已用完，请使用自己的 API key。',
    });
  } catch (err) {
    next(err);
  }
};

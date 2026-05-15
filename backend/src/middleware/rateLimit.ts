import rateLimit from 'express-rate-limit';

// WHY: memory store is acceptable for MVP / single-instance dev. Before
// phase 5.5 multi-instance deploy, swap in rate-limit-redis so per-IP
// counts are shared across processes — otherwise a malicious caller hops
// between instances and gets N × budget. The interface stays the same;
// only the store changes.
export const analyzeMenuRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'rate_limited',
    message: '请求过于频繁，请稍等片刻再试。',
  },
});

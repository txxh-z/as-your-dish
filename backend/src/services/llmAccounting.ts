import { randomUUID } from 'node:crypto';

import { db } from '../db/client.js';
import { llmCalls } from '../db/schema.js';
import { logger } from '../utils/logger.js';
import type { ProviderName } from './llm/provider.js';

export interface RecordCallArgs {
  provider: ProviderName;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedUsd: number;
  keySource: 'server' | 'user';
  callType: 'analyze_menu' | 'recommend';
  userId?: string | null;
}

/**
 * Persist a single LLM call (success, error, or cache hit) into `llm_calls`.
 * Returns void: callers should not depend on the success of bookkeeping.
 */
export async function recordCall(args: RecordCallArgs): Promise<void> {
  try {
    await db.insert(llmCalls).values({
      id: randomUUID(),
      userId: args.userId ?? null,
      provider: args.provider,
      model: args.model,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      estimatedUsd: args.estimatedUsd,
      keySource: args.keySource,
      callType: args.callType,
    });
  } catch (err) {
    // WHY: accounting must never break the user-facing request. The result
    // has either already been returned or is about to be; a bookkeeping
    // failure should land in server logs only. Operator can cross-check
    // the vendor's console for the missing entry.
    logger.error('llm accounting write failed', {
      provider: args.provider,
      model: args.model,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

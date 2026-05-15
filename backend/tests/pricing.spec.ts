import { describe, expect, it, vi } from 'vitest';

import { estimateCost } from '../src/services/llm/pricing.js';

describe('estimateCost', () => {
  it('calculates Anthropic Sonnet mixed input/output cost', () => {
    expect(estimateCost('anthropic', 'claude-sonnet-4-6', 1_000_000, 0)).toBe(3);
    expect(estimateCost('anthropic', 'claude-sonnet-4-6', 0, 1_000_000)).toBe(15);
    expect(estimateCost('anthropic', 'claude-sonnet-4-6', 6519, 5422)).toBe(
      0.100887,
    );
  });

  it('returns 0 for unknown models without throwing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(estimateCost('anthropic', 'unknown-model', 1_000_000, 1_000_000)).toBe(
      0,
    );
    expect(warn).toHaveBeenCalledWith(
      '[pricing] no entry for provider=anthropic model=unknown-model; estimating 0',
    );

    warn.mockRestore();
  });
});

import { createHash } from 'node:crypto';

/**
 * SHA-256 hex digest of the given buffer. Single-purpose so callers can
 * compose without pulling in the larger crypto namespace.
 */
export function sha256Hex(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Combine multiple image hashes into one stable key for menus that span
 * several pages. Order matters: same images in a different order count
 * as a different menu (different photos, different layout).
 */
export function combineImageHashes(hashes: readonly string[]): string {
  return sha256Hex(Buffer.from(hashes.join('|'), 'utf-8'));
}

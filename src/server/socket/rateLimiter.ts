// ============================================================================
// ECHOES OF CHAOS — Rate Limiter
// ============================================================================
// Token-bucket rate limiter per socket/player.
// Protects against spam on chat and game actions.
// ============================================================================

import { RATE_LIMITS } from '../../shared/constants.js';

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private chatBuckets = new Map<string, Bucket>();
  private actionBuckets = new Map<string, Bucket>();

  private checkBucket(
    buckets: Map<string, Bucket>,
    id: string,
    maxTokens: number,
    refillIntervalMs: number
  ): boolean {
    const now = Date.now();
    let bucket = buckets.get(id);

    if (!bucket) {
      bucket = { tokens: maxTokens - 1, lastRefill: now };
      buckets.set(id, bucket);
      return true;
    }

    // Refill tokens
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = (elapsed / refillIntervalMs) * maxTokens;
    bucket.tokens = Math.min(maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }

    return false;
  }

  public checkChat(id: string): boolean {
    return this.checkBucket(
      this.chatBuckets,
      id,
      RATE_LIMITS.CHAT.maxTokens,
      RATE_LIMITS.CHAT.refillIntervalMs
    );
  }

  public checkAction(id: string): boolean {
    return this.checkBucket(
      this.actionBuckets,
      id,
      RATE_LIMITS.GAME_ACTION.maxTokens,
      RATE_LIMITS.GAME_ACTION.refillIntervalMs
    );
  }

  public cleanup(id: string): void {
    this.chatBuckets.delete(id);
    this.actionBuckets.delete(id);
  }
}

export const rateLimiter = new RateLimiter();

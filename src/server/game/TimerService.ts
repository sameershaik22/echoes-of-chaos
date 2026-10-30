// ============================================================================
// ECHOES OF CHAOS — Timer Service
// ============================================================================
// Manages authoritative server timers per room.
// Emits backup ticks every 5 seconds (Amendment #7) and fires phase completion
// callbacks when timers expire or are cancelled early.
// ============================================================================

import { TIMER_TICK_INTERVAL } from '../../shared/constants.js';

export interface RoomTimer {
  endsAt: number;
  durationMs: number;
  timeoutId: NodeJS.Timeout | null;
  tickIntervalId: NodeJS.Timeout | null;
  onExpire: () => void;
  onTick?: (remainingMs: number) => void;
}

export class TimerService {
  private timers = new Map<string, RoomTimer>();

  /**
   * Start a timer for a room
   */
  public startTimer(
    roomCode: string,
    durationMs: number,
    onExpire: () => void,
    onTick?: (remainingMs: number) => void
  ): { endsAt: number } {
    this.clearTimer(roomCode);

    const now = Date.now();
    const endsAt = now + durationMs;

    const timeoutId = setTimeout(() => {
      this.clearTimer(roomCode);
      onExpire();
    }, durationMs);

    let tickIntervalId: NodeJS.Timeout | null = null;
    if (onTick) {
      tickIntervalId = setInterval(() => {
        const remaining = Math.max(0, endsAt - Date.now());
        if (remaining > 0) {
          onTick(remaining);
        } else {
          if (tickIntervalId) clearInterval(tickIntervalId);
        }
      }, TIMER_TICK_INTERVAL);
    }

    this.timers.set(roomCode, {
      endsAt,
      durationMs,
      timeoutId,
      tickIntervalId,
      onExpire,
      onTick,
    });

    return { endsAt };
  }

  /**
   * Clear any active timer for a room
   */
  public clearTimer(roomCode: string): void {
    const existing = this.timers.get(roomCode);
    if (existing) {
      if (existing.timeoutId) clearTimeout(existing.timeoutId);
      if (existing.tickIntervalId) clearInterval(existing.tickIntervalId);
      this.timers.delete(roomCode);
    }
  }

  /**
   * Get active timer details
   */
  public getTimer(roomCode: string): RoomTimer | undefined {
    return this.timers.get(roomCode);
  }

  /**
   * Get remaining milliseconds
   */
  public getRemainingMs(roomCode: string): number {
    const timer = this.timers.get(roomCode);
    if (!timer) return 0;
    return Math.max(0, timer.endsAt - Date.now());
  }
}

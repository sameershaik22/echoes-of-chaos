// ============================================================================
// ECHOES OF CHAOS — Shared Constants
// ============================================================================

import { Difficulty, ClueType } from './types.js';

// ========================================
// GAME SETTINGS
// ========================================

export const SYMBOL_POOL = [1, 2, 3, 4, 5, 6] as const;
export const COMBINATION_LENGTH = 4;
export const TOTAL_ROUNDS = 3;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;

/** Minimum player count for disruptor mode (below this → cooperative) */
export const DISRUPTOR_THRESHOLD = 4;

export const ROOM_CODE_LENGTH = 6;
export const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I/O/0/1 to avoid confusion

// ========================================
// TIMERS (milliseconds)
// ========================================

export const PHASE_TIMERS = {
  CLUE_PHASE: 15_000,
  DISCUSSION: 60_000,
  SUBMISSION: 15_000,
  VOTING: 20_000,
  REVEAL: 10_000,
} as const;

/** Timer-tick broadcast interval (5s per amendment #7) */
export const TIMER_TICK_INTERVAL = 5_000;

/** Reconnection grace period (amendment #1 / #5) */
export const RECONNECT_GRACE_PERIOD = 30_000;

/** Room TTL — cleaned up after this much inactivity */
export const ROOM_TTL = 15 * 60_000;

/** Room cleanup sweep interval */
export const ROOM_CLEANUP_INTERVAL = 60_000;

/** Proposal cooldown between new proposals (amendment #4) */
export const PROPOSAL_COOLDOWN = 3_000;

/** No new proposals allowed within final N ms of SUBMISSION (amendment #4) */
export const PROPOSAL_LOCKOUT_BEFORE_END = 3_000;

// ========================================
// SCORING (server-authoritative)
// ========================================

export const SCORING = {
  /** Team: correct combination decoded */
  CORRECT_COMBINATION: 500,
  /** Team: incorrect combination */
  INCORRECT_COMBINATION: 0,
  /** Team player: correctly identified the disruptor */
  CORRECT_IDENTIFICATION: 200,
  /** Team player: wrongly accused an innocent */
  INCORRECT_ACCUSATION: -100,
  /** Disruptor: team failed to decode */
  SUCCESSFUL_SABOTAGE: 500,
  /** Disruptor: avoided being identified */
  AVOIDED_IDENTIFICATION: 200,
  /** Disruptor: was caught */
  CAUGHT_IDENTIFICATION: 0,
} as const;

// Tie-break (amendment #3):
// 1. Total individual score (higher wins)
// 2. Correct disruptor identifications (more wins)
// 3. Shared rank (if still tied, players share the same rank)

// ========================================
// DIFFICULTY SETTINGS
// ========================================

export interface DifficultyConfig {
  allowRepeats: boolean;
  clueTypes: ClueType[];
  description: string;
  label: string;
}

export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultyConfig> = {
  [Difficulty.EASY]: {
    allowRepeats: false,
    clueTypes: [ClueType.EXACT_POSITION, ClueType.EXCLUSION],
    description: 'No repeated symbols. Direct clues. Good for learning.',
    label: 'Easy',
  },
  [Difficulty.MEDIUM]: {
    allowRepeats: false,
    clueTypes: [
      ClueType.EXACT_POSITION,
      ClueType.EXCLUSION,
      ClueType.PARITY,
      ClueType.ARITHMETIC,
      ClueType.FREQUENCY,
    ],
    description: 'No repeated symbols. All clue types. Requires deduction.',
    label: 'Medium',
  },
  [Difficulty.HARD]: {
    allowRepeats: true,
    clueTypes: [
      ClueType.EXACT_POSITION,
      ClueType.EXCLUSION,
      ClueType.PARITY,
      ClueType.ARITHMETIC,
      ClueType.FREQUENCY,
    ],
    description: 'Symbols may repeat. All clue types. Maximum challenge.',
    label: 'Hard',
  },
};

// ========================================
// RATE LIMITS
// ========================================

export const RATE_LIMITS = {
  CHAT: { maxTokens: 5, refillIntervalMs: 10_000 },
  GAME_ACTION: { maxTokens: 3, refillIntervalMs: 5_000 },
} as const;

// ========================================
// INPUT LIMITS
// ========================================

export const INPUT_LIMITS = {
  PLAYER_NAME_MIN: 1,
  PLAYER_NAME_MAX: 20,
  CHAT_MESSAGE_MAX: 200,
} as const;

// ========================================
// AVATAR CONFIG
// ========================================

export const AVATAR_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  CYBER_WOLF:    { emoji: '🐺', label: 'Cyber Wolf',    color: '#a855f7' },
  NEON_FOX:      { emoji: '🦊', label: 'Neon Fox',      color: '#fb923c' },
  HOLO_OWL:      { emoji: '🦉', label: 'Holo Owl',      color: '#22d3ee' },
  GLITCH_CAT:    { emoji: '🐱', label: 'Glitch Cat',    color: '#f472b6' },
  PIXEL_BEAR:    { emoji: '🐻', label: 'Pixel Bear',    color: '#a3e635' },
  VOID_SHARK:    { emoji: '🦈', label: 'Void Shark',    color: '#60a5fa' },
  QUANTUM_RAVEN: { emoji: '🐦‍⬛', label: 'Quantum Raven', color: '#c084fc' },
  FLUX_DRAGON:   { emoji: '🐉', label: 'Flux Dragon',   color: '#f97316' },
};

// ========================================
// SYMBOL DISPLAY
// ========================================

export const SYMBOL_DISPLAY: Record<number, { icon: string; label: string; color: string }> = {
  1: { icon: '◆', label: 'Diamond',  color: '#a855f7' },
  2: { icon: '■', label: 'Square',   color: '#22d3ee' },
  3: { icon: '▲', label: 'Triangle', color: '#fb923c' },
  4: { icon: '●', label: 'Circle',   color: '#f472b6' },
  5: { icon: '★', label: 'Star',     color: '#a3e635' },
  6: { icon: '⬡', label: 'Hexagon',  color: '#60a5fa' },
};

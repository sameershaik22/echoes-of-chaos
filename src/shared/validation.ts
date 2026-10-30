// ============================================================================
// ECHOES OF CHAOS — Shared Validation Utilities
// ============================================================================

import { Avatar, Difficulty } from './types.js';
import {
  INPUT_LIMITS,
  SYMBOL_POOL,
  COMBINATION_LENGTH,
  ROOM_CODE_LENGTH,
  ROOM_CODE_CHARS,
} from './constants.js';

/** Validate player name */
export function isValidPlayerName(name: unknown): name is string {
  return (
    typeof name === 'string' &&
    name.trim().length >= INPUT_LIMITS.PLAYER_NAME_MIN &&
    name.trim().length <= INPUT_LIMITS.PLAYER_NAME_MAX
  );
}

/** Validate avatar enum value */
export function isValidAvatar(avatar: unknown): avatar is Avatar {
  return typeof avatar === 'string' && Object.values(Avatar).includes(avatar as Avatar);
}

/** Validate difficulty enum value */
export function isValidDifficulty(difficulty: unknown): difficulty is Difficulty {
  return typeof difficulty === 'string' && Object.values(Difficulty).includes(difficulty as Difficulty);
}

/** Validate a 4-symbol answer array */
export function isValidAnswer(answer: unknown): answer is number[] {
  if (!Array.isArray(answer)) return false;
  if (answer.length !== COMBINATION_LENGTH) return false;
  return answer.every(
    (s) => typeof s === 'number' && Number.isInteger(s) && SYMBOL_POOL.includes(s as typeof SYMBOL_POOL[number])
  );
}

/** Validate room code format */
export function isValidRoomCode(code: unknown): code is string {
  if (typeof code !== 'string') return false;
  if (code.length !== ROOM_CODE_LENGTH) return false;
  return [...code].every((c) => ROOM_CODE_CHARS.includes(c));
}

/** Validate chat message */
export function isValidChatMessage(message: unknown): message is string {
  return (
    typeof message === 'string' &&
    message.trim().length > 0 &&
    message.trim().length <= INPUT_LIMITS.CHAT_MESSAGE_MAX
  );
}

/** Sanitize a player name (trim + truncate) */
export function sanitizePlayerName(name: string): string {
  return name.trim().slice(0, INPUT_LIMITS.PLAYER_NAME_MAX);
}

/** Sanitize a chat message */
export function sanitizeChatMessage(message: string): string {
  return message.trim().slice(0, INPUT_LIMITS.CHAT_MESSAGE_MAX);
}

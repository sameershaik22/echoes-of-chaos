// ============================================================================
// ECHOES OF CHAOS — Room Code Generator
// ============================================================================

import crypto from 'crypto';
import { ROOM_CODE_LENGTH, ROOM_CODE_CHARS } from '../../shared/constants.js';

export function generateRoomCode(): string {
  const chars = ROOM_CODE_CHARS;
  const bytes = crypto.randomBytes(ROOM_CODE_LENGTH);
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export function generateSessionToken(): string {
  return crypto.randomUUID();
}

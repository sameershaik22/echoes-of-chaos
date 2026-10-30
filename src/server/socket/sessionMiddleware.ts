// ============================================================================
// ECHOES OF CHAOS — Session Manager
// ============================================================================
// Manages cryptographically secure player sessions and tokens (Amendment #1).
// Sessions persist across socket reconnections within grace period.
// ============================================================================

import { PlayerSession } from '../../shared/types.js';
import { generateSessionToken } from '../utils/roomCodes.js';

export class SessionManager {
  private sessions = new Map<string, PlayerSession>(); // token -> PlayerSession
  private playerToToken = new Map<string, string>();   // playerId -> token
  private socketToToken = new Map<string, string>();   // socketId -> token

  /**
   * Create a new session for a player
   */
  public createSession(playerId: string, socketId: string, roomCode: string | null = null): PlayerSession {
    const token = generateSessionToken();
    const session: PlayerSession = {
      playerId,
      token,
      roomCode,
      socketId,
      disconnectedAt: null,
    };

    this.sessions.set(token, session);
    this.playerToToken.set(playerId, token);
    this.socketToToken.set(socketId, token);

    return session;
  }

  /**
   * Get session by token
   */
  public getSessionByToken(token: string): PlayerSession | undefined {
    return this.sessions.get(token);
  }

  /**
   * Get session by socketId
   */
  public getSessionBySocketId(socketId: string): PlayerSession | undefined {
    const token = this.socketToToken.get(socketId);
    if (!token) return undefined;
    return this.sessions.get(token);
  }

  /**
   * Get token for a player
   */
  public getTokenByPlayerId(playerId: string): string | undefined {
    return this.playerToToken.get(playerId);
  }

  /**
   * Update room code for a session
   */
  public setRoomCode(token: string, roomCode: string | null): void {
    const session = this.sessions.get(token);
    if (session) {
      session.roomCode = roomCode;
    }
  }

  /**
   * Reconnect a session with a new socketId
   */
  public reconnectSocket(token: string, newSocketId: string): PlayerSession | null {
    const session = this.sessions.get(token);
    if (!session) return null;

    // Clean up old socket mapping
    if (session.socketId) {
      this.socketToToken.delete(session.socketId);
    }

    session.socketId = newSocketId;
    session.disconnectedAt = null;
    this.socketToToken.set(newSocketId, token);

    return session;
  }

  /**
   * Mark socket as disconnected
   */
  public markSocketDisconnected(socketId: string): PlayerSession | null {
    const token = this.socketToToken.get(socketId);
    if (!token) return null;

    const session = this.sessions.get(token);
    if (session) {
      session.disconnectedAt = Date.now();
      session.socketId = null;
    }
    this.socketToToken.delete(socketId);

    return session || null;
  }

  /**
   * Remove a session
   */
  public removeSession(token: string): void {
    const session = this.sessions.get(token);
    if (session) {
      if (session.socketId) {
        this.socketToToken.delete(session.socketId);
      }
      this.playerToToken.delete(session.playerId);
      this.sessions.delete(token);
    }
  }
}

export const sessionManager = new SessionManager();

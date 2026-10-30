// ============================================================================
// ECHOES OF CHAOS — Room Manager
// ============================================================================
// Manages room lifecycle, player roster, host assignment, migration,
// and abandoned room cleanup.
// ============================================================================

import {
  Difficulty,
  Avatar,
  PublicPlayer,
  GamePhase,
} from '../../shared/types.js';
import {
  MIN_PLAYERS,
  MAX_PLAYERS,
  ROOM_TTL,
  RECONNECT_GRACE_PERIOD,
} from '../../shared/constants.js';
import { generateRoomCode } from '../utils/roomCodes.js';

export interface Room {
  code: string;
  hostId: string;
  players: Map<string, PublicPlayer>;
  playerJoinOrder: string[]; // Track join order for host migration
  difficulty: Difficulty;
  createdAt: number;
  lastActivity: number;
  reconnectTimers: Map<string, NodeJS.Timeout>;
}

export class RoomManager {
  private rooms = new Map<string, Room>();

  /**
   * Create a new room with host
   */
  public createRoom(hostId: string, hostName: string, avatar: Avatar): Room {
    let code: string;
    do {
      code = generateRoomCode();
    } while (this.rooms.has(code));

    const hostPlayer: PublicPlayer = {
      id: hostId,
      name: hostName,
      avatar,
      isHost: true,
      isReady: true, // Host is ready by default
      isConnected: true,
      score: 0,
    };

    const room: Room = {
      code,
      hostId,
      players: new Map([[hostId, hostPlayer]]),
      playerJoinOrder: [hostId],
      difficulty: Difficulty.MEDIUM,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      reconnectTimers: new Map(),
    };

    this.rooms.set(code, room);
    return room;
  }

  /**
   * Get a room by code
   */
  public getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  /**
   * Join an existing room
   */
  public joinRoom(
    code: string,
    playerId: string,
    playerName: string,
    avatar: Avatar
  ): { player: PublicPlayer; room: Room } {
    const room = this.getRoom(code);
    if (!room) {
      throw new Error('ROOM_NOT_FOUND');
    }

    if (room.players.size >= MAX_PLAYERS) {
      throw new Error('ROOM_FULL');
    }

    // Check if player is rejoining existing ID
    const existing = room.players.get(playerId);
    if (existing) {
      existing.isConnected = true;
      existing.name = playerName;
      existing.avatar = avatar;
      this.cancelReconnectTimer(room, playerId);
      room.lastActivity = Date.now();
      return { player: existing, room };
    }

    const newPlayer: PublicPlayer = {
      id: playerId,
      name: playerName,
      avatar,
      isHost: false,
      isReady: false,
      isConnected: true,
      score: 0,
    };

    room.players.set(playerId, newPlayer);
    room.playerJoinOrder.push(playerId);
    room.lastActivity = Date.now();

    return { player: newPlayer, room };
  }

  /**
   * Set player readiness (in lobby)
   */
  public setPlayerReady(code: string, playerId: string, isReady?: boolean): PublicPlayer {
    const room = this.getRoom(code);
    if (!room) throw new Error('ROOM_NOT_FOUND');

    const player = room.players.get(playerId);
    if (!player) throw new Error('PLAYER_NOT_FOUND');

    player.isReady = isReady !== undefined ? isReady : !player.isReady;
    room.lastActivity = Date.now();

    return player;
  }

  /**
   * Set game difficulty (host only)
   */
  public setDifficulty(code: string, requesterId: string, difficulty: Difficulty): Difficulty {
    const room = this.getRoom(code);
    if (!room) throw new Error('ROOM_NOT_FOUND');
    if (room.hostId !== requesterId) throw new Error('NOT_HOST');

    room.difficulty = difficulty;
    room.lastActivity = Date.now();
    return difficulty;
  }

  /**
   * Handle temporary disconnect: start 30s grace timer
   */
  public handlePlayerDisconnect(
    code: string,
    playerId: string,
    onGraceExpired: () => void
  ): boolean {
    const room = this.getRoom(code);
    if (!room) return false;

    const player = room.players.get(playerId);
    if (!player) return false;

    player.isConnected = false;
    room.lastActivity = Date.now();

    // Clear existing timer if any
    this.cancelReconnectTimer(room, playerId);

    // Start 30s grace timer
    const timer = setTimeout(() => {
      room.reconnectTimers.delete(playerId);
      onGraceExpired();
    }, RECONNECT_GRACE_PERIOD);

    room.reconnectTimers.set(playerId, timer);
    return true;
  }

  /**
   * Cancel disconnect grace timer upon reconnect
   */
  public cancelReconnectTimer(room: Room, playerId: string): void {
    const timer = room.reconnectTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      room.reconnectTimers.delete(playerId);
    }
  }

  /**
   * Reconnect a player back into the room
   */
  public handlePlayerReconnect(code: string, playerId: string): PublicPlayer | null {
    const room = this.getRoom(code);
    if (!room) return null;

    const player = room.players.get(playerId);
    if (!player) return null;

    player.isConnected = true;
    this.cancelReconnectTimer(room, playerId);
    room.lastActivity = Date.now();

    return player;
  }

  /**
   * Migrate host to longest-connected active player
   */
  public migrateHost(code: string): string | null {
    const room = this.getRoom(code);
    if (!room) return null;

    // Find the first connected player in playerJoinOrder who isn't the previous host
    let newHost: PublicPlayer | null = null;
    for (const pid of room.playerJoinOrder) {
      const p = room.players.get(pid);
      if (p && p.isConnected && pid !== room.hostId) {
        newHost = p;
        break;
      }
    }

    // If no connected player found, find any remaining player
    if (!newHost) {
      for (const pid of room.playerJoinOrder) {
        const p = room.players.get(pid);
        if (p && pid !== room.hostId) {
          newHost = p;
          break;
        }
      }
    }

    if (newHost) {
      // Demote old host if still in room
      const oldHost = room.players.get(room.hostId);
      if (oldHost) oldHost.isHost = false;

      newHost.isHost = true;
      room.hostId = newHost.id;
      return newHost.id;
    }

    return null;
  }

  /**
   * Remove a player permanently from a room
   */
  public removePlayer(
    code: string,
    playerId: string
  ): { newHostId: string | null; roomDeleted: boolean } {
    const room = this.getRoom(code);
    if (!room) return { newHostId: null, roomDeleted: true };

    this.cancelReconnectTimer(room, playerId);
    room.players.delete(playerId);
    room.playerJoinOrder = room.playerJoinOrder.filter((id) => id !== playerId);
    room.lastActivity = Date.now();

    if (room.players.size === 0) {
      this.deleteRoom(code);
      return { newHostId: null, roomDeleted: true };
    }

    let newHostId: string | null = null;
    if (room.hostId === playerId) {
      newHostId = this.migrateHost(code);
    }

    return { newHostId, roomDeleted: false };
  }

  /**
   * Delete room and cleanup all resources
   */
  public deleteRoom(code: string): void {
    const room = this.getRoom(code);
    if (room) {
      for (const timer of room.reconnectTimers.values()) {
        clearTimeout(timer);
      }
      room.reconnectTimers.clear();
      this.rooms.delete(code);
    }
  }

  /**
   * Sweep and cleanup abandoned rooms (every 60s)
   */
  public cleanupAbandonedRooms(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [code, room] of this.rooms.entries()) {
      // If room inactive for > ROOM_TTL (15 min) or empty, delete
      if (now - room.lastActivity > ROOM_TTL || room.players.size === 0) {
        this.deleteRoom(code);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get total room count
   */
  public getRoomCount(): number {
    return this.rooms.size;
  }
}

export const roomManager = new RoomManager();

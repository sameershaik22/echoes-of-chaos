import { describe, it, expect } from 'vitest';
import { RoomManager } from '../../src/server/game/RoomManager.js';
import { Avatar, Difficulty } from '../../src/shared/types.js';

describe('RoomManager', () => {
  it('creates a room with host player', () => {
    const rm = new RoomManager();
    const room = rm.createRoom('h1', 'HostPlayer', Avatar.CYBER_WOLF);

    expect(room.code.length).toBe(6);
    expect(room.hostId).toBe('h1');
    expect(room.players.size).toBe(1);
    expect(room.players.get('h1')?.isHost).toBe(true);
    expect(room.difficulty).toBe(Difficulty.MEDIUM);
  });

  it('allows players to join up to max 8', () => {
    const rm = new RoomManager();
    const room = rm.createRoom('h1', 'Host', Avatar.CYBER_WOLF);

    for (let i = 2; i <= 8; i++) {
      const { player } = rm.joinRoom(room.code, `p${i}`, `Player${i}`, Avatar.NEON_FOX);
      expect(player.id).toBe(`p${i}`);
    }

    expect(room.players.size).toBe(8);

    // 9th player rejected
    expect(() => rm.joinRoom(room.code, 'p9', 'Player9', Avatar.HOLO_OWL)).toThrow('ROOM_FULL');
  });

  it('migrates host to longest-connected player when host leaves', () => {
    const rm = new RoomManager();
    const room = rm.createRoom('h1', 'Host', Avatar.CYBER_WOLF);
    rm.joinRoom(room.code, 'p2', 'Second', Avatar.NEON_FOX);
    rm.joinRoom(room.code, 'p3', 'Third', Avatar.HOLO_OWL);

    const { newHostId } = rm.removePlayer(room.code, 'h1');
    expect(newHostId).toBe('p2');
    expect(room.hostId).toBe('p2');
    expect(room.players.get('p2')?.isHost).toBe(true);
  });

  it('handles player disconnect and reconnect grace period', () => {
    const rm = new RoomManager();
    const room = rm.createRoom('h1', 'Host', Avatar.CYBER_WOLF);
    rm.joinRoom(room.code, 'p2', 'Second', Avatar.NEON_FOX);

    let graceExpired = false;
    rm.handlePlayerDisconnect(room.code, 'p2', () => {
      graceExpired = true;
    });

    expect(room.players.get('p2')?.isConnected).toBe(false);

    // Reconnect cancels timer
    const reconnected = rm.handlePlayerReconnect(room.code, 'p2');
    expect(reconnected?.isConnected).toBe(true);
    expect(room.reconnectTimers.has('p2')).toBe(false);
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import express from 'express';
import { setupSocketHandlers } from '../../src/server/socket/handlers.js';
import { roomManager } from '../../src/server/game/RoomManager.js';
import { GameEngine } from '../../src/server/game/GameEngine.js';
import {
  Avatar,
  GamePhase,
  PlayerRole,
} from '../../src/shared/types.js';

describe('Socket.IO Multiplayer Integration Tests', () => {
  let ioServer: Server;
  let httpServer: any;
  let serverPort: number;
  let testGameEngine: GameEngine;

  beforeAll(async () => {
    const app = express();
    httpServer = createServer(app);
    ioServer = new Server(httpServer, {
      cors: { origin: '*' },
    });
    const { gameEngine } = setupSocketHandlers(ioServer);
    testGameEngine = gameEngine;

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        serverPort = (httpServer.address() as any).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    ioServer.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  const createClient = (): Promise<ClientSocket> => {
    return new Promise((resolve) => {
      const client = Client(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });
      client.on('connect', () => resolve(client));
    });
  };

  it('runs a complete 2-player cooperative flow and verifies Amendment #2 (skips voting)', async () => {
    const host = await createClient();
    const guest = await createClient();

    let roomCode = '';
    let hostToken = '';
    let guestToken = '';

    // 1. Host creates room
    const createPromise = new Promise<void>((resolve) => {
      host.on('room-created', (data: { roomCode: string }) => {
        roomCode = data.roomCode;
        resolve();
      });
      host.on('session-created', (data: { token: string }) => {
        hostToken = data.token;
      });
    });
    host.emit('create-room', { playerName: 'HostPlayer', avatar: Avatar.CYBER_WOLF });
    await createPromise;

    expect(roomCode.length).toBe(6);
    expect(hostToken).toBeDefined();

    // 2. Guest joins room
    const joinPromise = new Promise<void>((resolve) => {
      guest.on('session-created', (data: { token: string }) => {
        guestToken = data.token;
      });
      guest.on('room-joined', () => {
        resolve();
      });
    });
    guest.emit('join-room', { roomCode, playerName: 'GuestPlayer', avatar: Avatar.NEON_FOX });
    await joinPromise;

    expect(guestToken).toBeDefined();

    // 3. Guest readies up
    const readyPromise = new Promise<void>((resolve) => {
      host.on('player-ready-changed', (data: { playerId: string; isReady: boolean }) => {
        if (data.isReady) resolve();
      });
    });
    guest.emit('player-ready');
    await readyPromise;

    // 4. Set up role and start listeners BEFORE starting game
    let hostRole: PlayerRole | null = null;
    let guestRole: PlayerRole | null = null;

    const gameStartAndRolePromise = new Promise<void>((resolve) => {
      let hostStarted = false;
      let guestStarted = false;

      host.on('game-started', () => {
        hostStarted = true;
        if (hostStarted && guestStarted && hostRole && guestRole) resolve();
      });
      guest.on('game-started', () => {
        guestStarted = true;
        if (hostStarted && guestStarted && hostRole && guestRole) resolve();
      });
      host.on('your-role', (data: { role: PlayerRole }) => {
        hostRole = data.role;
        if (hostStarted && guestStarted && hostRole && guestRole) resolve();
      });
      guest.on('your-role', (data: { role: PlayerRole }) => {
        guestRole = data.role;
        if (hostStarted && guestStarted && hostRole && guestRole) resolve();
      });
    });

    host.emit('start-game');
    await gameStartAndRolePromise;

    expect(hostRole).toBe(PlayerRole.TEAM);
    expect(guestRole).toBe(PlayerRole.TEAM);

    // 5. Transition to SUBMISSION phase for proposal test
    const room = roomManager.getRoom(roomCode)!;
    testGameEngine.setPhaseForTesting(room, GamePhase.SUBMISSION);

    // 6. Propose answer & confirm
    const proposalPromise = new Promise<void>((resolve) => {
      guest.on('proposal-created', () => resolve());
    });
    host.emit('propose-answer', { answer: [1, 2, 3, 4] });
    await proposalPromise;

    // Set up listeners for lock and reveal BEFORE confirming proposal
    const lockPromise = new Promise<number[]>((resolve) => {
      host.on('answer-locked', (data: { answer: number[] }) => {
        resolve(data.answer);
      });
    });

    // Reveal promise (Amendment #2: skips voting in 2-player cooperative mode)
    const revealPromise = new Promise<any>((resolve) => {
      host.on('round-reveal', (data: any) => {
        resolve(data);
      });
    });

    guest.emit('confirm-proposal');

    const lockedAnswer = await lockPromise;
    expect(lockedAnswer).toEqual([1, 2, 3, 4]);

    const revealResult = await revealPromise;
    expect(revealResult.submittedAnswer).toEqual([1, 2, 3, 4]);
    expect(revealResult.disruptorId).toBeNull(); // No disruptor in cooperative mode

    host.disconnect();
    guest.disconnect();
  });

  it('verifies session reconnection with token (Amendment #1)', async () => {
    const client = await createClient();
    let sessionToken = '';
    let roomCode = '';

    const setupPromise = new Promise<void>((resolve) => {
      client.on('session-created', (data: { token: string }) => {
        sessionToken = data.token;
      });
      client.on('room-created', (data: { roomCode: string }) => {
        roomCode = data.roomCode;
        resolve();
      });
    });
    client.emit('create-room', { playerName: 'OriginalPlayer', avatar: Avatar.HOLO_OWL });
    await setupPromise;

    // Simulate socket disconnect
    client.disconnect();

    // Reconnect with new socket using same session token
    const newClient = await createClient();
    const syncPromise = new Promise<any>((resolve) => {
      newClient.on('full-state-sync', (data: any) => {
        resolve(data);
      });
    });

    newClient.emit('reconnect-session', { token: sessionToken });
    const syncData = await syncPromise;

    expect(syncData.state.code).toBe(roomCode);
    expect(syncData.serverTime).toBeGreaterThan(0);

    newClient.disconnect();
  });
});

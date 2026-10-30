// ============================================================================
// ECHOES OF CHAOS — Socket.IO Handlers
// ============================================================================
// Comprehensive event handling connecting sockets, session tokens,
// RoomManager, and GameEngine with per-room mutex protection and rate limiting.
// ============================================================================

import { Server, Socket } from 'socket.io';
import crypto from 'crypto';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  PlayerRole,
  Clue,
  GamePhase,
} from '../../shared/types.js';
import {
  isValidPlayerName,
  isValidAvatar,
  isValidDifficulty,
  isValidAnswer,
  isValidRoomCode,
  isValidChatMessage,
  sanitizePlayerName,
  sanitizeChatMessage,
} from '../../shared/validation.js';
import { MIN_PLAYERS } from '../../shared/constants.js';
import { roomManager } from '../game/RoomManager.js';
import { GameEngine } from '../game/GameEngine.js';
import { TimerService } from '../game/TimerService.js';
import { sessionManager } from './sessionMiddleware.js';
import { rateLimiter } from './rateLimiter.js';
import { roomMutex } from '../utils/mutex.js';

type CustomSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function setupSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>
): { gameEngine: GameEngine; timerService: TimerService } {
  const timerService = new TimerService();

  // Socket ID lookup for private emits (roles, clues)
  const getPlayerSocketId = (playerId: string): string | null => {
    const token = sessionManager.getTokenByPlayerId(playerId);
    if (!token) return null;
    const session = sessionManager.getSessionByToken(token);
    return session?.socketId || null;
  };

  const gameEngine = new GameEngine(timerService, {
    onPhaseChange: (roomCode, phase, endsAt, round) => {
      io.to(roomCode).emit('phase-changed', { phase, endsAt, round });
    },
    onTimerTick: (roomCode, remainingMs) => {
      io.to(roomCode).emit('timer-tick', { remaining: Math.ceil(remainingMs / 1000) });
    },
    onRoleAssigned: (socketId, role) => {
      io.to(socketId).emit('your-role', { role });
    },
    onCluesAssigned: (socketId, clues) => {
      io.to(socketId).emit('your-clues', { clues });
    },
    onProposalCreated: (roomCode, proposal) => {
      io.to(roomCode).emit('proposal-created', {
        answer: proposal.answer,
        proposerId: proposal.proposerId,
        proposerName: proposal.proposerName,
      });
    },
    onProposalConfirmed: (roomCode, confirmerId, totalConfirms, needed) => {
      io.to(roomCode).emit('proposal-confirmed', {
        confirmerId,
        totalConfirms,
        needed,
      });
    },
    onAnswerLocked: (roomCode, answer) => {
      io.to(roomCode).emit('answer-locked', { answer });
    },
    onVoteRecorded: (roomCode, votesCount, totalNeeded) => {
      io.to(roomCode).emit('vote-recorded', { votesCount, totalNeeded });
    },
    onRoundReveal: (roomCode, result) => {
      io.to(roomCode).emit('round-reveal', result);
    },
    onGameOver: (roomCode, rankings) => {
      io.to(roomCode).emit('game-over', { rankings });
    },
    getPlayerSocketId,
  });

  // Scheduled sweep for abandoned rooms every 60s
  setInterval(() => {
    const cleaned = roomManager.cleanupAbandonedRooms();
    if (cleaned > 0) {
      console.log(`[RoomManager] Cleaned up ${cleaned} abandoned room(s)`);
    }
  }, 60_000);

  io.on('connection', (socket: CustomSocket) => {
    // ----------------------------------------------------------------------
    // Clock synchronization handshake (Amendment #7)
    // ----------------------------------------------------------------------
    socket.on('ping-sync', (data) => {
      socket.emit('pong-sync', {
        clientTime: data?.clientTime || 0,
        serverTime: Date.now(),
      });
    });

    // ----------------------------------------------------------------------
    // Create Room
    // ----------------------------------------------------------------------
    socket.on('create-room', (data) => {
      if (!data || !isValidPlayerName(data.playerName) || !isValidAvatar(data.avatar)) {
        socket.emit('error', { code: 'INVALID_INPUT', message: 'Invalid player name or avatar.' });
        return;
      }

      const playerId = crypto.randomUUID();
      const sanitizedName = sanitizePlayerName(data.playerName);
      const session = sessionManager.createSession(playerId, socket.id);

      const room = roomManager.createRoom(playerId, sanitizedName, data.avatar);
      sessionManager.setRoomCode(session.token, room.code);

      socket.join(room.code);

      socket.emit('session-created', { token: session.token, playerId });
      socket.emit('room-created', { roomCode: room.code });
      socket.emit('room-joined', { state: gameEngine.getPublicState(room) });
    });

    // ----------------------------------------------------------------------
    // Join Room
    // ----------------------------------------------------------------------
    socket.on('join-room', (data) => {
      if (
        !data ||
        !isValidRoomCode(data.roomCode) ||
        !isValidPlayerName(data.playerName) ||
        !isValidAvatar(data.avatar)
      ) {
        socket.emit('error', { code: 'INVALID_INPUT', message: 'Invalid room code, name, or avatar.' });
        return;
      }

      const code = data.roomCode.toUpperCase();
      const room = roomManager.getRoom(code);
      if (!room) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found.' });
        return;
      }

      const gameState = gameEngine.getState(code);
      if (gameState && gameState.phase !== GamePhase.WAITING && gameState.phase !== GamePhase.GAME_OVER) {
        socket.emit('error', { code: 'GAME_IN_PROGRESS', message: 'Game is currently in progress.' });
        return;
      }

      const playerId = crypto.randomUUID();
      const sanitizedName = sanitizePlayerName(data.playerName);

      try {
        const { player } = roomManager.joinRoom(code, playerId, sanitizedName, data.avatar);
        const session = sessionManager.createSession(playerId, socket.id, code);

        socket.join(code);

        socket.emit('session-created', { token: session.token, playerId });
        socket.emit('room-joined', { state: gameEngine.getPublicState(room) });
        socket.to(code).emit('player-joined', { player });
      } catch (err: any) {
        socket.emit('error', { code: err.message || 'JOIN_FAILED', message: 'Failed to join room.' });
      }
    });

    // ----------------------------------------------------------------------
    // Reconnect Session (Amendment #1)
    // ----------------------------------------------------------------------
    socket.on('reconnect-session', (data) => {
      if (!data || !data.token || typeof data.token !== 'string') {
        socket.emit('error', { code: 'INVALID_TOKEN', message: 'Valid session token required.' });
        return;
      }

      const session = sessionManager.getSessionByToken(data.token);
      if (!session || !session.roomCode) {
        socket.emit('error', { code: 'SESSION_EXPIRED', message: 'Session expired or not found.' });
        return;
      }

      const room = roomManager.getRoom(session.roomCode);
      if (!room) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room no longer exists.' });
        return;
      }

      // Rebind socket to session
      sessionManager.reconnectSocket(data.token, socket.id);
      roomManager.handlePlayerReconnect(room.code, session.playerId);

      socket.join(room.code);

      // Reconnected player state sync
      const gameState = gameEngine.getState(room.code);
      let role: PlayerRole | undefined;
      let clues: Clue[] | undefined;

      if (gameState) {
        role = gameState.playerRoles.get(session.playerId);
        clues = gameState.playerClues.get(session.playerId);
      }

      socket.emit('session-created', { token: session.token, playerId: session.playerId });
      socket.emit('full-state-sync', {
        state: gameEngine.getPublicState(room),
        role,
        clues,
        serverTime: Date.now(),
      });

      socket.to(room.code).emit('player-reconnected', { playerId: session.playerId });
    });

    // ----------------------------------------------------------------------
    // Player Ready (Lobby)
    // ----------------------------------------------------------------------
    socket.on('player-ready', () => {
      const session = sessionManager.getSessionBySocketId(socket.id);
      if (!session || !session.roomCode) return;

      roomMutex.runExclusive(session.roomCode, () => {
        const room = roomManager.getRoom(session.roomCode!);
        if (!room) return;

        try {
          const player = roomManager.setPlayerReady(room.code, session.playerId);
          io.to(room.code).emit('player-ready-changed', {
            playerId: player.id,
            isReady: player.isReady,
          });
        } catch (err: any) {
          socket.emit('error', { code: err.message, message: 'Could not update ready state.' });
        }
      });
    });

    // ----------------------------------------------------------------------
    // Set Difficulty (Host Only)
    // ----------------------------------------------------------------------
    socket.on('set-difficulty', (data) => {
      const session = sessionManager.getSessionBySocketId(socket.id);
      if (!session || !session.roomCode || !data || !isValidDifficulty(data.difficulty)) {
        socket.emit('error', { code: 'INVALID_INPUT', message: 'Invalid difficulty value.' });
        return;
      }

      roomMutex.runExclusive(session.roomCode, () => {
        const room = roomManager.getRoom(session.roomCode!);
        if (!room) return;

        try {
          const diff = roomManager.setDifficulty(room.code, session.playerId, data.difficulty);
          io.to(room.code).emit('difficulty-changed', { difficulty: diff });
        } catch (err: any) {
          socket.emit('error', { code: err.message, message: 'Only host can change difficulty.' });
        }
      });
    });

    // ----------------------------------------------------------------------
    // Start Game (Host Only)
    // ----------------------------------------------------------------------
    socket.on('start-game', () => {
      const session = sessionManager.getSessionBySocketId(socket.id);
      if (!session || !session.roomCode) return;

      roomMutex.runExclusive(session.roomCode, () => {
        const room = roomManager.getRoom(session.roomCode!);
        if (!room) return;

        if (room.hostId !== session.playerId) {
          socket.emit('error', { code: 'NOT_HOST', message: 'Only the host can start the game.' });
          return;
        }

        const connectedPlayers = Array.from(room.players.values()).filter((p) => p.isConnected);
        if (connectedPlayers.length < MIN_PLAYERS) {
          socket.emit('error', {
            code: 'NOT_ENOUGH_PLAYERS',
            message: `At least ${MIN_PLAYERS} players are required to start.`,
          });
          return;
        }

        // Verify all non-host players are ready
        const allReady = connectedPlayers.every((p) => p.isHost || p.isReady);
        if (!allReady) {
          socket.emit('error', {
            code: 'PLAYERS_NOT_READY',
            message: 'All players must be ready before starting.',
          });
          return;
        }

        io.to(room.code).emit('game-started', { round: 1, totalRounds: 3 });
        gameEngine.startGame(room);
      });
    });

    // ----------------------------------------------------------------------
    // Send Chat
    // ----------------------------------------------------------------------
    socket.on('send-chat', (data) => {
      const session = sessionManager.getSessionBySocketId(socket.id);
      if (!session || !session.roomCode) return;

      if (!rateLimiter.checkChat(socket.id)) {
        socket.emit('error', { code: 'RATE_LIMITED', message: 'Chatting too fast. Please wait.' });
        return;
      }

      if (!data || !isValidChatMessage(data.message)) {
        return;
      }

      const room = roomManager.getRoom(session.roomCode);
      if (!room) return;

      const player = room.players.get(session.playerId);
      if (!player) return;

      const sanitized = sanitizeChatMessage(data.message);
      io.to(room.code).emit('chat-message', {
        senderId: player.id,
        senderName: player.name,
        message: sanitized,
        timestamp: Date.now(),
      });
    });

    // ----------------------------------------------------------------------
    // Propose Answer (Submission Phase)
    // ----------------------------------------------------------------------
    socket.on('propose-answer', (data) => {
      const session = sessionManager.getSessionBySocketId(socket.id);
      if (!session || !session.roomCode) return;

      if (!rateLimiter.checkAction(socket.id)) {
        socket.emit('error', { code: 'RATE_LIMITED', message: 'Action rate limit reached.' });
        return;
      }

      if (!data || !isValidAnswer(data.answer)) {
        socket.emit('error', { code: 'INVALID_ANSWER', message: 'Invalid answer combination.' });
        return;
      }

      roomMutex.runExclusive(session.roomCode, () => {
        const room = roomManager.getRoom(session.roomCode!);
        if (!room) return;

        const result = gameEngine.proposeAnswer(room, session.playerId, data.answer);
        if (!result.success) {
          socket.emit('error', { code: result.error || 'PROPOSAL_FAILED', message: result.error || '' });
        }
      });
    });

    // ----------------------------------------------------------------------
    // Confirm Proposal (Submission Phase)
    // ----------------------------------------------------------------------
    socket.on('confirm-proposal', () => {
      const session = sessionManager.getSessionBySocketId(socket.id);
      if (!session || !session.roomCode) return;

      if (!rateLimiter.checkAction(socket.id)) {
        socket.emit('error', { code: 'RATE_LIMITED', message: 'Action rate limit reached.' });
        return;
      }

      roomMutex.runExclusive(session.roomCode, () => {
        const room = roomManager.getRoom(session.roomCode!);
        if (!room) return;

        const result = gameEngine.confirmProposal(room, session.playerId);
        if (!result.success) {
          socket.emit('error', { code: result.error || 'CONFIRM_FAILED', message: result.error || '' });
        }
      });
    });

    // ----------------------------------------------------------------------
    // Cast Vote (Voting Phase)
    // ----------------------------------------------------------------------
    socket.on('cast-vote', (data) => {
      const session = sessionManager.getSessionBySocketId(socket.id);
      if (!session || !session.roomCode) return;

      if (!rateLimiter.checkAction(socket.id)) {
        socket.emit('error', { code: 'RATE_LIMITED', message: 'Action rate limit reached.' });
        return;
      }

      if (!data || typeof data.suspectId !== 'string') {
        socket.emit('error', { code: 'INVALID_SUSPECT', message: 'Valid suspect ID required.' });
        return;
      }

      roomMutex.runExclusive(session.roomCode, () => {
        const room = roomManager.getRoom(session.roomCode!);
        if (!room) return;

        const result = gameEngine.castVote(room, session.playerId, data.suspectId);
        if (!result.success) {
          socket.emit('error', { code: result.error || 'VOTE_FAILED', message: result.error || '' });
        }
      });
    });

    // ----------------------------------------------------------------------
    // Play Again (Game Over Phase)
    // ----------------------------------------------------------------------
    socket.on('play-again', () => {
      const session = sessionManager.getSessionBySocketId(socket.id);
      if (!session || !session.roomCode) return;

      roomMutex.runExclusive(session.roomCode, () => {
        const room = roomManager.getRoom(session.roomCode!);
        if (!room) return;

        gameEngine.playAgain(room);
        io.to(room.code).emit('game-started', { round: 1, totalRounds: 3 });
      });
    });

    // ----------------------------------------------------------------------
    // Leave Room
    // ----------------------------------------------------------------------
    socket.on('leave-room', () => {
      const session = sessionManager.getSessionBySocketId(socket.id);
      if (!session || !session.roomCode) return;

      const roomCode = session.roomCode;
      roomMutex.runExclusive(roomCode, () => {
        const { newHostId, roomDeleted } = roomManager.removePlayer(roomCode, session.playerId);
        sessionManager.setRoomCode(session.token, null);
        socket.leave(roomCode);

        if (!roomDeleted) {
          io.to(roomCode).emit('player-left', {
            playerId: session.playerId,
            newHostId: newHostId || undefined,
          });
        } else {
          gameEngine.deleteRoomState(roomCode);
        }
      });
    });

    // ----------------------------------------------------------------------
    // Disconnect
    // ----------------------------------------------------------------------
    socket.on('disconnect', () => {
      const session = sessionManager.markSocketDisconnected(socket.id);
      rateLimiter.cleanup(socket.id);

      if (!session || !session.roomCode) return;

      const roomCode = session.roomCode;
      const playerId = session.playerId;

      // Start 30s grace period via RoomManager
      roomManager.handlePlayerDisconnect(roomCode, playerId, () => {
        // Grace period expired!
        roomMutex.runExclusive(roomCode, () => {
          const { newHostId, roomDeleted } = roomManager.removePlayer(roomCode, playerId);
          sessionManager.removeSession(session.token);

          if (!roomDeleted) {
            io.to(roomCode).emit('player-left', {
              playerId,
              newHostId: newHostId || undefined,
            });
          } else {
            gameEngine.deleteRoomState(roomCode);
          }
        });
      });

      // Broadcast temporary disconnect
      io.to(roomCode).emit('player-disconnected', { playerId });
    });
  });

  return { gameEngine, timerService };
}

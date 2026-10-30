// ============================================================================
// ECHOES OF CHAOS — Socket Hook & Client Service
// ============================================================================
// Connects client to Socket.IO backend, handles clock sync handshake,
// automatically reconnects using sessionStorage token, and dispatches actions.
// ============================================================================

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  Avatar,
  Difficulty,
} from '../../shared/types.js';
import { useGameStore } from '../store/gameStore.js';
import { soundEngine } from '../audio/SoundEngine.js';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let globalSocket: AppSocket | null = null;

export function getSocket(): AppSocket {
  if (!globalSocket) {
    // In dev, Vite proxies /socket.io to localhost:3001
    // In production, served on same origin
    const url = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';

    globalSocket = io(url, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
  }
  return globalSocket;
}

export function useSocket() {
  const store = useGameStore();
  const socketRef = useRef<AppSocket>(getSocket());

  useEffect(() => {
    const socket = socketRef.current;

    const handleConnect = () => {
      store.setIsConnected(true);

      // Perform clock synchronization handshake (Amendment #7)
      socket.emit('ping-sync', { clientTime: Date.now() });

      // Try reconnecting existing session if token exists in sessionStorage (Amendment #1)
      const savedToken = sessionStorage.getItem('eoc_token');
      if (savedToken) {
        socket.emit('reconnect-session', { token: savedToken });
      }
    };

    const handleDisconnect = () => {
      store.setIsConnected(false);
      store.addToast('Connection lost. Reconnecting...', 'warning');
    };

    // Pong sync handler
    const handlePongSync = (data: { clientTime: number; serverTime: number }) => {
      const now = Date.now();
      const roundTrip = now - data.clientTime;
      const estimatedServerTimeNow = data.serverTime + roundTrip / 2;
      const offset = estimatedServerTimeNow - now;
      store.setClockOffset(offset);
    };

    // Session created
    const handleSessionCreated = (data: { token: string; playerId: string }) => {
      store.setSession(data.token, data.playerId);
    };

    // Room joined
    const handleRoomJoined = (data: { state: any }) => {
      soundEngine.playJoin();
      store.setPublicRoomState(data.state);
    };

    // Player joined
    const handlePlayerJoined = (data: { player: any }) => {
      soundEngine.playJoin();
      store.addToast(`${data.player.name} joined the room`, 'info');
      store.setPublicRoomState({
        ...store,
        code: store.roomCode || '',
        hostId: store.hostId || '',
        players: [...store.players.filter((p) => p.id !== data.player.id), data.player],
        difficulty: store.difficulty,
        phase: store.phase,
        round: store.round,
        totalRounds: store.totalRounds,
        phaseEndsAt: store.phaseEndsAt,
        currentProposal: store.currentProposal,
        lockedAnswer: store.lockedAnswer,
        votesCount: store.votesCount,
        votesNeeded: store.votesNeeded,
        roundResults: store.roundResults,
        isCooperativeMode: store.isCooperativeMode,
      });
    };

    // Player left
    const handlePlayerLeft = (data: { playerId: string; newHostId?: string }) => {
      const leaving = store.players.find((p) => p.id === data.playerId);
      if (leaving) {
        store.addToast(`${leaving.name} left the room`, 'info');
      }

      const updatedPlayers = store.players.filter((p) => p.id !== data.playerId);
      if (data.newHostId) {
        const newHost = updatedPlayers.find((p) => p.id === data.newHostId);
        if (newHost) newHost.isHost = true;
      }

      store.setPublicRoomState({
        ...store,
        code: store.roomCode || '',
        hostId: data.newHostId || store.hostId || '',
        players: updatedPlayers,
        difficulty: store.difficulty,
        phase: store.phase,
        round: store.round,
        totalRounds: store.totalRounds,
        phaseEndsAt: store.phaseEndsAt,
        currentProposal: store.currentProposal,
        lockedAnswer: store.lockedAnswer,
        votesCount: store.votesCount,
        votesNeeded: store.votesNeeded,
        roundResults: store.roundResults,
        isCooperativeMode: store.isCooperativeMode,
      });
    };

    // Player reconnected
    const handlePlayerReconnected = (data: { playerId: string }) => {
      const p = store.players.find((pl) => pl.id === data.playerId);
      if (p) {
        p.isConnected = true;
        store.addToast(`${p.name} reconnected`, 'info');
      }
    };

    // Player disconnected
    const handlePlayerDisconnected = (data: { playerId: string }) => {
      const p = store.players.find((pl) => pl.id === data.playerId);
      if (p) {
        p.isConnected = false;
        store.addToast(`${p.name} lost connection`, 'warning');
      }
    };

    // Ready changed
    const handlePlayerReadyChanged = (data: { playerId: string; isReady: boolean }) => {
      const updated = store.players.map((p) =>
        p.id === data.playerId ? { ...p, isReady: data.isReady } : p
      );
      useGameStore.setState({ players: updated });
    };

    // Difficulty changed
    const handleDifficultyChanged = (data: { difficulty: Difficulty }) => {
      useGameStore.setState({ difficulty: data.difficulty });
      store.addToast(`Difficulty set to ${data.difficulty}`, 'info');
    };

    // Game started
    const handleGameStarted = (data: { round: number; totalRounds: number }) => {
      soundEngine.playPhaseChange();
      useGameStore.setState({
        round: data.round,
        totalRounds: data.totalRounds,
        currentProposal: null,
        lockedAnswer: null,
        votesCount: 0,
      });
    };

    // Private role
    const handleYourRole = (data: { role: any }) => {
      store.setRole(data.role);
    };

    // Private clues
    const handleYourClues = (data: { clues: any }) => {
      store.setClues(data.clues);
    };

    // Phase changed
    const handlePhaseChanged = (data: { phase: any; endsAt: number; round: number }) => {
      soundEngine.playPhaseChange();
      useGameStore.setState({
        phase: data.phase,
        phaseEndsAt: data.endsAt,
        round: data.round,
      });
    };

    // Timer tick backup (Amendment #7)
    const handleTimerTick = () => {
      // Periodic server tick — triggers subtle sound near end
    };

    // Chat
    const handleChatMessage = (msg: any) => {
      store.addChatMessage(msg);
    };

    // Proposal created
    const handleProposalCreated = (data: any) => {
      store.setProposal({
        answer: data.answer,
        proposerId: data.proposerId,
        proposerName: data.proposerName,
        confirmations: [data.proposerId],
        createdAt: Date.now(),
      });
    };

    // Proposal confirmed
    const handleProposalConfirmed = (data: any) => {
      store.setProposalConfirmed(data.confirmerId, data.totalConfirms, data.needed);
    };

    // Answer locked
    const handleAnswerLocked = (data: any) => {
      store.setLockedAnswer(data.answer);
      store.addToast('Answer locked for submission!', 'success');
    };

    // Vote recorded
    const handleVoteRecorded = (data: any) => {
      store.setVotesCount(data.votesCount, data.totalNeeded);
    };

    // Round reveal
    const handleRoundReveal = (result: any) => {
      store.setRoundReveal(result);
    };

    // Game over
    const handleGameOver = (data: any) => {
      store.setGameOver(data.rankings);
    };

    // Full state sync (reconnection)
    const handleFullStateSync = (data: any) => {
      store.setPublicRoomState(data.state);
      if (data.role) store.setRole(data.role);
      if (data.clues) store.setClues(data.clues);
      store.addToast('Game state restored', 'success');
    };

    // Error
    const handleError = (data: { code: string; message: string }) => {
      store.addToast(data.message || data.code, 'error');
    };

    // Register all socket listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('pong-sync', handlePongSync);
    socket.on('session-created', handleSessionCreated);
    socket.on('room-joined', handleRoomJoined);
    socket.on('player-joined', handlePlayerJoined);
    socket.on('player-left', handlePlayerLeft);
    socket.on('player-reconnected', handlePlayerReconnected);
    socket.on('player-disconnected', handlePlayerDisconnected);
    socket.on('player-ready-changed', handlePlayerReadyChanged);
    socket.on('difficulty-changed', handleDifficultyChanged);
    socket.on('game-started', handleGameStarted);
    socket.on('your-role', handleYourRole);
    socket.on('your-clues', handleYourClues);
    socket.on('phase-changed', handlePhaseChanged);
    socket.on('timer-tick', handleTimerTick);
    socket.on('chat-message', handleChatMessage);
    socket.on('proposal-created', handleProposalCreated);
    socket.on('proposal-confirmed', handleProposalConfirmed);
    socket.on('answer-locked', handleAnswerLocked);
    socket.on('vote-recorded', handleVoteRecorded);
    socket.on('round-reveal', handleRoundReveal);
    socket.on('game-over', handleGameOver);
    socket.on('full-state-sync', handleFullStateSync);
    socket.on('error', handleError);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('pong-sync', handlePongSync);
      socket.off('session-created', handleSessionCreated);
      socket.off('room-joined', handleRoomJoined);
      socket.off('player-joined', handlePlayerJoined);
      socket.off('player-left', handlePlayerLeft);
      socket.off('player-reconnected', handlePlayerReconnected);
      socket.off('player-disconnected', handlePlayerDisconnected);
      socket.off('player-ready-changed', handlePlayerReadyChanged);
      socket.off('difficulty-changed', handleDifficultyChanged);
      socket.off('game-started', handleGameStarted);
      socket.off('your-role', handleYourRole);
      socket.off('your-clues', handleYourClues);
      socket.off('phase-changed', handlePhaseChanged);
      socket.off('timer-tick', handleTimerTick);
      socket.off('chat-message', handleChatMessage);
      socket.off('proposal-created', handleProposalCreated);
      socket.off('proposal-confirmed', handleProposalConfirmed);
      socket.off('answer-locked', handleAnswerLocked);
      socket.off('vote-recorded', handleVoteRecorded);
      socket.off('round-reveal', handleRoundReveal);
      socket.off('game-over', handleGameOver);
      socket.off('full-state-sync', handleFullStateSync);
      socket.off('error', handleError);
    };
  }, []);

  // Action methods
  const createRoom = (playerName: string, avatar: Avatar) => {
    soundEngine.playClick();
    socketRef.current.emit('create-room', { playerName, avatar });
  };

  const joinRoom = (roomCode: string, playerName: string, avatar: Avatar) => {
    soundEngine.playClick();
    socketRef.current.emit('join-room', { roomCode, playerName, avatar });
  };

  const setPlayerReady = () => {
    soundEngine.playClick();
    socketRef.current.emit('player-ready');
  };

  const setDifficulty = (difficulty: Difficulty) => {
    soundEngine.playClick();
    socketRef.current.emit('set-difficulty', { difficulty });
  };

  const startGame = () => {
    soundEngine.playClick();
    socketRef.current.emit('start-game');
  };

  const sendChat = (message: string) => {
    socketRef.current.emit('send-chat', { message });
  };

  const proposeAnswer = (answer: number[]) => {
    socketRef.current.emit('propose-answer', { answer });
  };

  const confirmProposal = () => {
    socketRef.current.emit('confirm-proposal');
  };

  const castVote = (suspectId: string) => {
    socketRef.current.emit('cast-vote', { suspectId });
  };

  const playAgain = () => {
    soundEngine.playClick();
    socketRef.current.emit('play-again');
  };

  const leaveRoom = () => {
    soundEngine.playClick();
    socketRef.current.emit('leave-room');
    store.clearSession();
  };

  return {
    socket: socketRef.current,
    createRoom,
    joinRoom,
    setPlayerReady,
    setDifficulty,
    startGame,
    sendChat,
    proposeAnswer,
    confirmProposal,
    castVote,
    playAgain,
    leaveRoom,
  };
}

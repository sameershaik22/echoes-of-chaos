// ============================================================================
// ECHOES OF CHAOS — Zustand Client Store
// ============================================================================
// Central reactive state store for room, gameplay, chat, and sound settings.
// ============================================================================

import { create } from 'zustand';
import {
  GamePhase,
  PlayerRole,
  Difficulty,
  Clue,
  Proposal,
  RoundResult,
  PublicRoomState,
  PublicPlayer,
  ChatMessage,
} from '../../shared/types.js';
import { soundEngine } from '../audio/SoundEngine.js';

export interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface GameStoreState {
  // Connection & Session
  isConnected: boolean;
  playerId: string | null;
  sessionToken: string | null;

  // Room State
  roomCode: string | null;
  hostId: string | null;
  players: PublicPlayer[];
  difficulty: Difficulty;
  phase: GamePhase;
  round: number;
  totalRounds: number;
  phaseEndsAt: number | null;
  currentProposal: Proposal | null;
  lockedAnswer: number[] | null;
  votesCount: number;
  votesNeeded: number;
  roundResults: RoundResult[];
  isCooperativeMode: boolean;
  finalRankings: Array<PublicPlayer & { rank: number; correctIdentifications: number }> | null;

  // Private Player State
  role: PlayerRole | null;
  clues: Clue[];

  // Chat
  chatMessages: ChatMessage[];

  // Time Sync
  clockOffset: number; // serverTime - clientTime (ms)

  // Audio & Modals
  isMuted: boolean;
  showHowToPlay: boolean;
  showOnboarding: boolean;
  toasts: ToastItem[];

  // Actions
  setIsConnected: (connected: boolean) => void;
  setSession: (token: string, playerId: string) => void;
  clearSession: () => void;
  setPublicRoomState: (state: PublicRoomState) => void;
  setRole: (role: PlayerRole) => void;
  setClues: (clues: Clue[]) => void;
  setProposal: (proposal: Proposal | null) => void;
  setProposalConfirmed: (confirmerId: string, totalConfirms: number, needed: number) => void;
  setLockedAnswer: (answer: number[]) => void;
  setVotesCount: (count: number, needed: number) => void;
  setRoundReveal: (result: RoundResult) => void;
  setGameOver: (rankings: Array<PublicPlayer & { rank: number; correctIdentifications: number }>) => void;
  addChatMessage: (msg: ChatMessage) => void;
  setClockOffset: (offset: number) => void;
  toggleMute: () => void;
  setShowHowToPlay: (show: boolean) => void;
  setShowOnboarding: (show: boolean) => void;
  addToast: (message: string, type?: ToastItem['type']) => void;
  removeToast: (id: string) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  // Defaults
  isConnected: false,
  playerId: null,
  sessionToken: null,

  roomCode: null,
  hostId: null,
  players: [],
  difficulty: Difficulty.MEDIUM,
  phase: GamePhase.WAITING,
  round: 1,
  totalRounds: 3,
  phaseEndsAt: null,
  currentProposal: null,
  lockedAnswer: null,
  votesCount: 0,
  votesNeeded: 0,
  roundResults: [],
  isCooperativeMode: true,
  finalRankings: null,

  role: null,
  clues: [],

  chatMessages: [],
  clockOffset: 0,

  isMuted: soundEngine.getIsMuted(),
  showHowToPlay: false,
  showOnboarding: false,
  toasts: [],

  // Setters
  setIsConnected: (connected) => set({ isConnected: connected }),

  setSession: (token, playerId) => {
    try {
      sessionStorage.setItem('eoc_token', token);
      sessionStorage.setItem('eoc_playerId', playerId);
    } catch {}
    set({ sessionToken: token, playerId });
  },

  clearSession: () => {
    try {
      sessionStorage.removeItem('eoc_token');
      sessionStorage.removeItem('eoc_playerId');
    } catch {}
    set({
      sessionToken: null,
      playerId: null,
      roomCode: null,
      phase: GamePhase.WAITING,
      role: null,
      clues: [],
      chatMessages: [],
      finalRankings: null,
    });
  },

  setPublicRoomState: (state) => {
    set({
      roomCode: state.code,
      hostId: state.hostId,
      players: state.players,
      difficulty: state.difficulty,
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      phaseEndsAt: state.phaseEndsAt,
      currentProposal: state.currentProposal,
      lockedAnswer: state.lockedAnswer,
      votesCount: state.votesCount,
      votesNeeded: state.votesNeeded,
      roundResults: state.roundResults,
      isCooperativeMode: state.isCooperativeMode,
    });
  },

  setRole: (role) => set({ role }),
  setClues: (clues) => set({ clues }),

  setProposal: (proposal) => {
    soundEngine.playPropose();
    set({ currentProposal: proposal });
  },

  setProposalConfirmed: (confirmerId, totalConfirms, needed) => {
    soundEngine.playConfirm();
    const curr = get().currentProposal;
    if (curr) {
      const updated = {
        ...curr,
        confirmations: curr.confirmations.includes(confirmerId)
          ? curr.confirmations
          : [...curr.confirmations, confirmerId],
      };
      set({ currentProposal: updated });
    }
  },

  setLockedAnswer: (answer) => {
    soundEngine.playLocked();
    set({ lockedAnswer: answer });
  },

  setVotesCount: (count, needed) => {
    soundEngine.playVote();
    set({ votesCount: count, votesNeeded: needed });
  },

  setRoundReveal: (result) => {
    if (result.wasCorrect) {
      soundEngine.playCorrect();
    } else {
      soundEngine.playWrong();
    }

    set((state) => ({
      phase: GamePhase.REVEAL,
      roundResults: [...state.roundResults.filter((r) => r.round !== result.round), result],
    }));
  },

  setGameOver: (rankings) => {
    soundEngine.playVictory();
    set({ phase: GamePhase.GAME_OVER, finalRankings: rankings });
  },

  addChatMessage: (msg) => {
    soundEngine.playChat();
    set((state) => ({
      chatMessages: [...state.chatMessages.slice(-50), msg],
    }));
  },

  setClockOffset: (offset) => set({ clockOffset: offset }),

  toggleMute: () => {
    const muted = soundEngine.toggleMute();
    set({ isMuted: muted });
  },

  setShowHowToPlay: (show) => set({ showHowToPlay: show }),
  setShowOnboarding: (show) => set({ showOnboarding: show }),

  addToast: (message, type = 'info') => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    set((state) => ({
      toasts: [...state.toasts.slice(-4), { id, message, type }],
    }));
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  resetGame: () => {
    set({
      phase: GamePhase.WAITING,
      round: 1,
      role: null,
      clues: [],
      currentProposal: null,
      lockedAnswer: null,
      votesCount: 0,
      roundResults: [],
      finalRankings: null,
    });
  },
}));

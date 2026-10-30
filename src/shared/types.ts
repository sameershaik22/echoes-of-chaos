// ============================================================================
// ECHOES OF CHAOS — Shared Type Definitions
// ============================================================================
// These types are shared between client and server.
// NEVER include server-internal secrets (isTruthful, role assignments) in
// types that flow to the client.
// ============================================================================

// ========================================
// ENUMS
// ========================================

export enum GamePhase {
  WAITING = 'WAITING',
  CLUE_PHASE = 'CLUE_PHASE',
  DISCUSSION = 'DISCUSSION',
  SUBMISSION = 'SUBMISSION',
  VOTING = 'VOTING',
  REVEAL = 'REVEAL',
  GAME_OVER = 'GAME_OVER',
}

export enum PlayerRole {
  TEAM = 'TEAM',
  DISRUPTOR = 'DISRUPTOR',
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export enum ClueType {
  EXACT_POSITION = 'EXACT_POSITION',
  EXCLUSION = 'EXCLUSION',
  PARITY = 'PARITY',
  ARITHMETIC = 'ARITHMETIC',
  FREQUENCY = 'FREQUENCY',
}

export enum Avatar {
  CYBER_WOLF = 'CYBER_WOLF',
  NEON_FOX = 'NEON_FOX',
  HOLO_OWL = 'HOLO_OWL',
  GLITCH_CAT = 'GLITCH_CAT',
  PIXEL_BEAR = 'PIXEL_BEAR',
  VOID_SHARK = 'VOID_SHARK',
  QUANTUM_RAVEN = 'QUANTUM_RAVEN',
  FLUX_DRAGON = 'FLUX_DRAGON',
}

// ========================================
// CLUE INTERFACES
// ========================================

/** Base shape for all clue types */
export interface BaseClue {
  id: string;
  type: ClueType;
  description: string;
}

/** "Position P is S" */
export interface ExactPositionClue extends BaseClue {
  type: ClueType.EXACT_POSITION;
  position: number; // 1–4
  symbol: number;   // 1–6
}

/** "Position P is NOT S" */
export interface ExclusionClue extends BaseClue {
  type: ClueType.EXCLUSION;
  position: number;
  symbol: number;
}

/** "Position P is even/odd" */
export interface ParityClue extends BaseClue {
  type: ClueType.PARITY;
  position: number;
  parity: 'even' | 'odd';
}

/** "Sum of positions P1 and P2 is N" */
export interface ArithmeticClue extends BaseClue {
  type: ClueType.ARITHMETIC;
  positions: [number, number];
  sum: number;
}

/** "Symbol S appears exactly N times" */
export interface FrequencyClue extends BaseClue {
  type: ClueType.FREQUENCY;
  symbol: number;
  count: number;
}

/** Union of all clue types — sent to clients (no truthfulness flag) */
export type Clue =
  | ExactPositionClue
  | ExclusionClue
  | ParityClue
  | ArithmeticClue
  | FrequencyClue;

// ========================================
// SERVER-INTERNAL CLUE TRACKING
// (Never imported on client side)
// ========================================

export interface ServerClue {
  clue: Clue;
  isTruthful: boolean;
  assignedTo: string; // playerId
}

// ========================================
// PLAYER
// ========================================

/** Public player info — broadcast to all players in the room */
export interface PublicPlayer {
  id: string;
  name: string;
  avatar: Avatar;
  isHost: boolean;
  isReady: boolean;
  isConnected: boolean;
  score: number;
}

/** Server-internal session — maps token to player identity */
export interface PlayerSession {
  playerId: string;
  token: string;           // Cryptographically secure, stored in client sessionStorage
  roomCode: string | null;
  socketId: string | null;
  disconnectedAt: number | null;
}

// ========================================
// PROPOSAL (answer submission flow)
// ========================================

export interface Proposal {
  answer: number[];         // The proposed 4-symbol combo
  proposerId: string;
  proposerName: string;
  confirmations: string[];  // playerIds who confirmed (proposer auto-included)
  createdAt: number;        // Server timestamp
}

// ========================================
// ROUND RESULT
// ========================================

export interface RoundResult {
  round: number;
  secretCombination: number[];
  submittedAnswer: number[] | null;
  wasCorrect: boolean;
  disruptorId: string | null;
  disruptorDisconnected: boolean;
  votes: Record<string, string>;   // voterId → suspectId
  scoreChanges: Record<string, number>; // playerId → delta for this round
}

// ========================================
// PUBLIC ROOM STATE (sent to clients)
// ========================================

export interface PublicRoomState {
  code: string;
  hostId: string;
  players: PublicPlayer[];
  difficulty: Difficulty;
  phase: GamePhase;
  round: number;
  totalRounds: number;
  phaseEndsAt: number | null;      // Server timestamp (ms since epoch)
  currentProposal: Proposal | null;
  lockedAnswer: number[] | null;
  votesCount: number;
  votesNeeded: number;
  roundResults: RoundResult[];     // Results from completed rounds
  isCooperativeMode: boolean;      // true for 2–3 players (no disruptor, no voting)
}

// ========================================
// CHAT MESSAGE
// ========================================

export interface ChatMessage {
  senderId: string;
  senderName: string;
  message: string;
  timestamp: number;
}

// ========================================
// SOCKET EVENTS — Client → Server
// ========================================

export interface ClientToServerEvents {
  'create-room': (data: { playerName: string; avatar: Avatar }) => void;
  'join-room': (data: { roomCode: string; playerName: string; avatar: Avatar }) => void;
  'reconnect-session': (data: { token: string }) => void;
  'player-ready': () => void;
  'set-difficulty': (data: { difficulty: Difficulty }) => void;
  'start-game': () => void;
  'send-chat': (data: { message: string }) => void;
  'propose-answer': (data: { answer: number[] }) => void;
  'confirm-proposal': () => void;
  'cast-vote': (data: { suspectId: string }) => void;
  'play-again': () => void;
  'leave-room': () => void;
  'ping-sync': (data: { clientTime: number }) => void;
}

// ========================================
// SOCKET EVENTS — Server → Client
// ========================================

export interface ServerToClientEvents {
  // Session & room lifecycle
  'session-created': (data: { token: string; playerId: string }) => void;
  'room-created': (data: { roomCode: string }) => void;
  'room-joined': (data: { state: PublicRoomState }) => void;
  'player-joined': (data: { player: PublicPlayer }) => void;
  'player-left': (data: { playerId: string; newHostId?: string }) => void;
  'player-reconnected': (data: { playerId: string }) => void;
  'player-disconnected': (data: { playerId: string }) => void;
  'player-ready-changed': (data: { playerId: string; isReady: boolean }) => void;
  'difficulty-changed': (data: { difficulty: Difficulty }) => void;
  'host-migrated': (data: { newHostId: string }) => void;

  // Game flow
  'game-started': (data: { round: number; totalRounds: number }) => void;
  'your-role': (data: { role: PlayerRole }) => void;
  'your-clues': (data: { clues: Clue[] }) => void;
  'phase-changed': (data: { phase: GamePhase; endsAt: number; round: number }) => void;
  'timer-tick': (data: { remaining: number }) => void;

  // Chat
  'chat-message': (data: ChatMessage) => void;

  // Submission
  'proposal-created': (data: { answer: number[]; proposerId: string; proposerName: string }) => void;
  'proposal-confirmed': (data: { confirmerId: string; totalConfirms: number; needed: number }) => void;
  'answer-locked': (data: { answer: number[] }) => void;

  // Voting
  'vote-recorded': (data: { votesCount: number; totalNeeded: number }) => void;

  // Results
  'round-reveal': (data: RoundResult) => void;
  'game-over': (data: { rankings: Array<PublicPlayer & { rank: number; correctIdentifications: number }> }) => void;

  // Reconnection
  'full-state-sync': (data: {
    state: PublicRoomState;
    role?: PlayerRole;
    clues?: Clue[];
    serverTime: number;
  }) => void;

  // Clock sync
  'pong-sync': (data: { clientTime: number; serverTime: number }) => void;

  // Errors
  'error': (data: { code: string; message: string }) => void;
}

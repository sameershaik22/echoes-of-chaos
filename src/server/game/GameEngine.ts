// ============================================================================
// ECHOES OF CHAOS — Game Engine
// ============================================================================
// State machine managing all phases, transitions, proposals, voting,
// and scoring for a room.
// Strictly adheres to all 13 approved amendments.
// ============================================================================

import {
  GamePhase,
  PlayerRole,
  Difficulty,
  Clue,
  ServerClue,
  Proposal,
  RoundResult,
  PublicRoomState,
  PublicPlayer,
} from '../../shared/types.js';
import {
  TOTAL_ROUNDS,
  PHASE_TIMERS,
  PROPOSAL_COOLDOWN,
  PROPOSAL_LOCKOUT_BEFORE_END,
  DISRUPTOR_THRESHOLD,
} from '../../shared/constants.js';
import { Room } from './RoomManager.js';
import { ClueGenerator } from './ClueGenerator.js';
import { ScoringEngine, PlayerRankEntry } from './ScoringEngine.js';
import { TimerService } from './TimerService.js';

export interface RoomGameState {
  roomCode: string;
  phase: GamePhase;
  round: number;
  totalRounds: number;
  phaseEndsAt: number | null;
  secretCombination: number[];
  truthfulClues: Clue[];
  playerClues: Map<string, Clue[]>;
  playerRoles: Map<string, PlayerRole>;
  serverClues: ServerClue[];
  currentProposal: Proposal | null;
  lastProposalTime: number;
  lockedAnswer: number[] | null;
  votes: Map<string, string>; // voterId -> suspectId
  roundResults: RoundResult[];
  disruptorId: string | null;
  disruptorHistory: string[]; // Track past disruptors for fair rotation (Amendment #13)
  correctIdentifications: Record<string, number>; // playerId -> count
}

export interface GameEngineEvents {
  onPhaseChange: (roomCode: string, phase: GamePhase, endsAt: number, round: number) => void;
  onTimerTick: (roomCode: string, remainingMs: number) => void;
  onRoleAssigned: (socketId: string, role: PlayerRole) => void;
  onCluesAssigned: (socketId: string, clues: Clue[]) => void;
  onProposalCreated: (roomCode: string, proposal: Proposal) => void;
  onProposalConfirmed: (roomCode: string, confirmerId: string, totalConfirms: number, needed: number) => void;
  onAnswerLocked: (roomCode: string, answer: number[]) => void;
  onVoteRecorded: (roomCode: string, votesCount: number, totalNeeded: number) => void;
  onRoundReveal: (roomCode: string, result: RoundResult) => void;
  onGameOver: (roomCode: string, rankings: PlayerRankEntry[]) => void;
  getPlayerSocketId: (playerId: string) => string | null;
}

export class GameEngine {
  private states = new Map<string, RoomGameState>();
  private timerService: TimerService;
  private events: GameEngineEvents;

  constructor(timerService: TimerService, events: GameEngineEvents) {
    this.timerService = timerService;
    this.events = events;
  }

  /**
   * Get or initialize room game state
   */
  public getState(roomCode: string): RoomGameState | undefined {
    return this.states.get(roomCode);
  }

  /**
   * Start game from lobby
   */
  public startGame(room: Room): void {
    const isCooperative = room.players.size < DISRUPTOR_THRESHOLD;

    const state: RoomGameState = {
      roomCode: room.code,
      phase: GamePhase.WAITING,
      round: 1,
      totalRounds: TOTAL_ROUNDS,
      phaseEndsAt: null,
      secretCombination: [],
      truthfulClues: [],
      playerClues: new Map(),
      playerRoles: new Map(),
      serverClues: [],
      currentProposal: null,
      lastProposalTime: 0,
      lockedAnswer: null,
      votes: new Map(),
      roundResults: [],
      disruptorId: null,
      disruptorHistory: [],
      correctIdentifications: {},
    };

    // Initialize scores & identification trackers
    for (const player of room.players.values()) {
      player.score = 0;
      state.correctIdentifications[player.id] = 0;
    }

    this.states.set(room.code, state);
    this.startRound(room, state);
  }

  /**
   * Start a new round
   */
  private startRound(room: Room, state: RoomGameState): void {
    const connectedPlayers = Array.from(room.players.values()).filter((p) => p.isConnected);
    const connectedIds = connectedPlayers.map((p) => p.id);
    const isCooperative = connectedPlayers.length < DISRUPTOR_THRESHOLD;

    // Reset round-transient state
    state.currentProposal = null;
    state.lastProposalTime = 0;
    state.lockedAnswer = null;
    state.votes.clear();

    // 1. Role Assignment
    state.playerRoles.clear();
    let disruptorId: string | null = null;

    if (!isCooperative) {
      // Pick disruptor with fair rotation: prefer players who haven't been disruptor yet (Amendment #13)
      const candidates = connectedIds.filter((id) => !state.disruptorHistory.includes(id));
      const pool = candidates.length > 0 ? candidates : connectedIds;
      disruptorId = pool[Math.floor(Math.random() * pool.length)];
      state.disruptorHistory.push(disruptorId);

      for (const id of connectedIds) {
        state.playerRoles.set(id, id === disruptorId ? PlayerRole.DISRUPTOR : PlayerRole.TEAM);
      }
    } else {
      for (const id of connectedIds) {
        state.playerRoles.set(id, PlayerRole.TEAM);
      }
    }
    state.disruptorId = disruptorId;

    // 2. Clue Generation
    const puzzle = ClueGenerator.generatePuzzle(connectedIds, room.difficulty, disruptorId);
    state.secretCombination = puzzle.secretCombination;
    state.truthfulClues = puzzle.truthfulClues;
    state.playerClues = puzzle.playerClues;
    state.serverClues = puzzle.serverClues;

    // 3. Send private info to each player
    for (const id of connectedIds) {
      const socketId = this.events.getPlayerSocketId(id);
      if (socketId) {
        const role = state.playerRoles.get(id) || PlayerRole.TEAM;
        const clues = state.playerClues.get(id) || [];
        this.events.onRoleAssigned(socketId, role);
        this.events.onCluesAssigned(socketId, clues);
      }
    }

    // 4. Transition to CLUE_PHASE
    this.transitionToPhase(room, state, GamePhase.CLUE_PHASE);
  }

  /**
   * Transition to a new phase and manage timers
   */
  private transitionToPhase(room: Room, state: RoomGameState, phase: GamePhase): void {
    state.phase = phase;
    let duration = 0;

    switch (phase) {
      case GamePhase.CLUE_PHASE:
        duration = PHASE_TIMERS.CLUE_PHASE;
        break;
      case GamePhase.DISCUSSION:
        duration = PHASE_TIMERS.DISCUSSION;
        break;
      case GamePhase.SUBMISSION:
        duration = PHASE_TIMERS.SUBMISSION;
        break;
      case GamePhase.VOTING:
        duration = PHASE_TIMERS.VOTING;
        break;
      case GamePhase.REVEAL:
        duration = PHASE_TIMERS.REVEAL;
        break;
      case GamePhase.GAME_OVER:
        duration = 0;
        break;
    }

    if (duration > 0) {
      const { endsAt } = this.timerService.startTimer(
        room.code,
        duration,
        () => this.onPhaseTimeout(room, state),
        (remainingMs) => this.events.onTimerTick(room.code, remainingMs)
      );
      state.phaseEndsAt = endsAt;
    } else {
      this.timerService.clearTimer(room.code);
      state.phaseEndsAt = null;
    }

    this.events.onPhaseChange(room.code, state.phase, state.phaseEndsAt || 0, state.round);
  }

  /**
   * Phase timer expired handler
   */
  private onPhaseTimeout(room: Room, state: RoomGameState): void {
    const isCooperative = room.players.size < DISRUPTOR_THRESHOLD;

    switch (state.phase) {
      case GamePhase.CLUE_PHASE:
        // Move to DISCUSSION
        this.transitionToPhase(room, state, GamePhase.DISCUSSION);
        break;

      case GamePhase.DISCUSSION:
        // Move to SUBMISSION
        this.transitionToPhase(room, state, GamePhase.SUBMISSION);
        break;

      case GamePhase.SUBMISSION:
        // If timer expires without locked answer:
        // Amendment #4: unconfirmed proposal counts as no answer.
        // If lockedAnswer is already set, it was locked before timer expiration.
        // Now determine next phase:
        // Amendment #2: For 2–3 players: transition directly to REVEAL (skip VOTING).
        if (isCooperative) {
          this.executeReveal(room, state);
        } else {
          this.transitionToPhase(room, state, GamePhase.VOTING);
        }
        break;

      case GamePhase.VOTING:
        // Timer expired on voting: evaluate votes and proceed to REVEAL
        this.executeReveal(room, state);
        break;

      case GamePhase.REVEAL:
        // Reveal timer finished: next round or Game Over
        if (state.round < state.totalRounds) {
          state.round += 1;
          this.startRound(room, state);
        } else {
          this.executeGameOver(room, state);
        }
        break;
    }
  }

  /**
   * Player proposes an answer in SUBMISSION phase
   */
  public proposeAnswer(
    room: Room,
    playerId: string,
    answer: number[]
  ): { success: boolean; error?: string } {
    const state = this.states.get(room.code);
    if (!state || state.phase !== GamePhase.SUBMISSION) {
      return { success: false, error: 'NOT_SUBMISSION_PHASE' };
    }

    if (state.lockedAnswer) {
      return { success: false, error: 'ANSWER_ALREADY_LOCKED' };
    }

    const now = Date.now();

    // Amendment #4: 3-second proposal cooldown
    if (now - state.lastProposalTime < PROPOSAL_COOLDOWN) {
      return { success: false, error: 'PROPOSAL_COOLDOWN' };
    }

    // Amendment #4: Disallow new proposals in final 3 seconds of submission phase
    if (state.phaseEndsAt && state.phaseEndsAt - now < PROPOSAL_LOCKOUT_BEFORE_END) {
      return { success: false, error: 'PROPOSAL_LOCKOUT_FINAL_SECONDS' };
    }

    const player = room.players.get(playerId);
    if (!player) return { success: false, error: 'PLAYER_NOT_FOUND' };

    state.lastProposalTime = now;
    state.currentProposal = {
      answer,
      proposerId: playerId,
      proposerName: player.name,
      confirmations: [playerId], // Proposer auto-confirms
      createdAt: now,
    };

    this.events.onProposalCreated(room.code, state.currentProposal);

    // Check if 1 confirmation is already enough (e.g. 1 player edge case, or check threshold)
    this.checkProposalThreshold(room, state);

    return { success: true };
  }

  /**
   * Player confirms the active proposal
   */
  public confirmProposal(room: Room, playerId: string): { success: boolean; error?: string } {
    const state = this.states.get(room.code);
    if (!state || state.phase !== GamePhase.SUBMISSION) {
      return { success: false, error: 'NOT_SUBMISSION_PHASE' };
    }

    if (state.lockedAnswer) {
      return { success: false, error: 'ANSWER_ALREADY_LOCKED' };
    }

    const proposal = state.currentProposal;
    if (!proposal) {
      return { success: false, error: 'NO_ACTIVE_PROPOSAL' };
    }

    // Prevent duplicate confirmation
    if (proposal.confirmations.includes(playerId)) {
      return { success: false, error: 'ALREADY_CONFIRMED' };
    }

    proposal.confirmations.push(playerId);

    const needed = this.getRequiredConfirmations(room);
    this.events.onProposalConfirmed(room.code, playerId, proposal.confirmations.length, needed);

    this.checkProposalThreshold(room, state);

    return { success: true };
  }

  /**
   * Calculate required confirmations: majority of connected players
   */
  private getRequiredConfirmations(room: Room): number {
    const connectedCount = Array.from(room.players.values()).filter((p) => p.isConnected).length;
    return Math.floor(connectedCount / 2) + 1;
  }

  /**
   * Check if active proposal reached confirmation threshold
   */
  private checkProposalThreshold(room: Room, state: RoomGameState): void {
    if (!state.currentProposal || state.lockedAnswer) return;

    const needed = this.getRequiredConfirmations(room);
    if (state.currentProposal.confirmations.length >= needed) {
      // Lock answer!
      state.lockedAnswer = [...state.currentProposal.answer];
      this.events.onAnswerLocked(room.code, state.lockedAnswer);

      // Early transition! Clear submission timer
      this.timerService.clearTimer(room.code);

      const isCooperative = room.players.size < DISRUPTOR_THRESHOLD;
      if (isCooperative) {
        // Amendment #2: Skip voting in 2–3 players
        this.executeReveal(room, state);
      } else {
        // 4–8 players: proceed to voting
        this.transitionToPhase(room, state, GamePhase.VOTING);
      }
    }
  }

  /**
   * Player casts a vote in VOTING phase
   */
  public castVote(
    room: Room,
    voterId: string,
    suspectId: string
  ): { success: boolean; error?: string } {
    const state = this.states.get(room.code);
    if (!state || state.phase !== GamePhase.VOTING) {
      return { success: false, error: 'NOT_VOTING_PHASE' };
    }

    // Cannot vote for self
    if (voterId === suspectId) {
      return { success: false, error: 'CANNOT_VOTE_FOR_SELF' };
    }

    // Suspect must exist in room
    if (!room.players.has(suspectId)) {
      return { success: false, error: 'INVALID_SUSPECT' };
    }

    // Cannot vote twice
    if (state.votes.has(voterId)) {
      return { success: false, error: 'ALREADY_VOTED' };
    }

    state.votes.set(voterId, suspectId);

    const connectedPlayers = Array.from(room.players.values()).filter((p) => p.isConnected);
    this.events.onVoteRecorded(room.code, state.votes.size, connectedPlayers.length);

    // If all connected players have voted, transition to REVEAL immediately
    if (state.votes.size >= connectedPlayers.length) {
      this.timerService.clearTimer(room.code);
      this.executeReveal(room, state);
    }

    return { success: true };
  }

  /**
   * Execute round reveal and score calculation
   */
  private executeReveal(room: Room, state: RoomGameState): void {
    const isCooperative = room.players.size < DISRUPTOR_THRESHOLD;

    // Check if submitted answer was correct
    let wasCorrect = false;
    if (state.lockedAnswer && state.secretCombination) {
      wasCorrect =
        state.lockedAnswer.length === state.secretCombination.length &&
        state.lockedAnswer.every((val, idx) => val === state.secretCombination[idx]);
    }

    // Check disruptor disconnect status (Amendment #9)
    let disruptorDisconnected = false;
    if (state.disruptorId) {
      const disruptor = room.players.get(state.disruptorId);
      disruptorDisconnected = !disruptor || !disruptor.isConnected;
    }

    const votesObj: Record<string, string> = {};
    for (const [v, s] of state.votes.entries()) {
      votesObj[v] = s;
    }

    const playerIds = Array.from(room.players.keys());

    const scoreResult = ScoringEngine.calculateRoundScores({
      isCooperative,
      wasCorrect,
      disruptorId: state.disruptorId,
      disruptorDisconnected,
      votes: votesObj,
      playerIds,
    });

    // Apply scores to players
    for (const [pid, delta] of Object.entries(scoreResult.scoreChanges)) {
      const p = room.players.get(pid);
      if (p) {
        p.score += delta;
      }
    }

    // Track correct identifications
    for (const voterId of scoreResult.correctVoters) {
      state.correctIdentifications[voterId] = (state.correctIdentifications[voterId] || 0) + 1;
    }

    const roundResult: RoundResult = {
      round: state.round,
      secretCombination: state.secretCombination,
      submittedAnswer: state.lockedAnswer,
      wasCorrect,
      disruptorId: isCooperative ? null : state.disruptorId,
      disruptorDisconnected,
      votes: votesObj,
      scoreChanges: scoreResult.scoreChanges,
    };

    state.roundResults.push(roundResult);

    this.events.onRoundReveal(room.code, roundResult);
    this.transitionToPhase(room, state, GamePhase.REVEAL);
  }

  /**
   * Finalize game and calculate final rankings (Amendment #3)
   */
  private executeGameOver(room: Room, state: RoomGameState): void {
    state.phase = GamePhase.GAME_OVER;
    state.phaseEndsAt = null;
    this.timerService.clearTimer(room.code);

    const players = Array.from(room.players.values());
    const rankings = ScoringEngine.rankPlayers(players, state.correctIdentifications);

    this.events.onGameOver(room.code, rankings);
    this.events.onPhaseChange(room.code, GamePhase.GAME_OVER, 0, state.round);
  }

  /**
   * Rematch / Play again (Amendment #13)
   */
  public playAgain(room: Room): void {
    const state = this.states.get(room.code);
    if (!state) return;

    // Reset round results and scores, but preserve room difficulty and player roster
    this.startGame(room);
  }

  /**
   * Generate public room state for client synchronization
   */
  public getPublicState(room: Room): PublicRoomState {
    const state = this.states.get(room.code);
    const isCooperative = room.players.size < DISRUPTOR_THRESHOLD;

    if (!state) {
      return {
        code: room.code,
        hostId: room.hostId,
        players: Array.from(room.players.values()),
        difficulty: room.difficulty,
        phase: GamePhase.WAITING,
        round: 1,
        totalRounds: TOTAL_ROUNDS,
        phaseEndsAt: null,
        currentProposal: null,
        lockedAnswer: null,
        votesCount: 0,
        votesNeeded: 0,
        roundResults: [],
        isCooperativeMode: isCooperative,
      };
    }

    const connectedCount = Array.from(room.players.values()).filter((p) => p.isConnected).length;

    return {
      code: room.code,
      hostId: room.hostId,
      players: Array.from(room.players.values()),
      difficulty: room.difficulty,
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      phaseEndsAt: state.phaseEndsAt,
      currentProposal: state.currentProposal,
      lockedAnswer: state.lockedAnswer,
      votesCount: state.votes.size,
      votesNeeded: connectedCount,
      roundResults: state.roundResults,
      isCooperativeMode: isCooperative,
    };
  }

  /**
   * Clean up state when room is deleted
   */
  public deleteRoomState(roomCode: string): void {
    this.timerService.clearTimer(roomCode);
    this.states.delete(roomCode);
  }

  /**
   * For testing: force transition to a specific phase
   */
  public setPhaseForTesting(room: Room, phase: GamePhase): void {
    const state = this.states.get(room.code);
    if (state) {
      this.transitionToPhase(room, state, phase);
    }
  }
}

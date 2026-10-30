// ============================================================================
// ECHOES OF CHAOS — Scoring Engine
// ============================================================================
// Server-authoritative scoring calculations and tie-breaking.
// Adheres strictly to Amendment #3 (Score → Disruptor IDs → Shared Rank)
// and Amendment #9 (Disruptor disconnect: skip voting bonus, no team bonus).
// ============================================================================

import { SCORING } from '../../shared/constants.js';
import { PublicPlayer } from '../../shared/types.js';

export interface RoundScoreInput {
  isCooperative: boolean;
  wasCorrect: boolean;
  disruptorId: string | null;
  disruptorDisconnected: boolean;
  votes: Record<string, string>; // voterId → suspectId
  playerIds: string[];
}

export interface RoundScoreResult {
  scoreChanges: Record<string, number>;
  disruptorCaught: boolean;
  correctVoters: string[];
  incorrectVoters: string[];
}

export interface PlayerRankEntry extends PublicPlayer {
  rank: number;
  correctIdentifications: number;
}

export class ScoringEngine {
  /**
   * Calculate score changes for a completed round
   */
  public static calculateRoundScores(input: RoundScoreInput): RoundScoreResult {
    const {
      isCooperative,
      wasCorrect,
      disruptorId,
      disruptorDisconnected,
      votes,
      playerIds,
    } = input;

    const scoreChanges: Record<string, number> = {};
    for (const pid of playerIds) {
      scoreChanges[pid] = 0;
    }

    // Cooperative mode (2–3 players): only combination points apply
    if (isCooperative || !disruptorId) {
      const comboPoints = wasCorrect ? SCORING.CORRECT_COMBINATION : SCORING.INCORRECT_COMBINATION;
      for (const pid of playerIds) {
        scoreChanges[pid] += comboPoints;
      }
      return {
        scoreChanges,
        disruptorCaught: false,
        correctVoters: [],
        incorrectVoters: [],
      };
    }

    // Competitive mode with Disruptor (4–8 players)
    const teamPlayerIds = playerIds.filter((id) => id !== disruptorId);

    // 1. Combination outcome
    if (wasCorrect) {
      for (const pid of teamPlayerIds) {
        scoreChanges[pid] += SCORING.CORRECT_COMBINATION;
      }
      // Disruptor gets 0 points for combination if team succeeded
    } else {
      // Team failed: Disruptor receives sabotage bonus
      scoreChanges[disruptorId] += SCORING.SUCCESSFUL_SABOTAGE;
    }

    // 2. Voting outcome
    // Amendment #9: If disruptor disconnected, skip voting bonus entirely. Do NOT award team bonus.
    if (disruptorDisconnected) {
      return {
        scoreChanges,
        disruptorCaught: false,
        correctVoters: [],
        incorrectVoters: [],
      };
    }

    // Count votes per suspect
    const voteTallies: Record<string, number> = {};
    for (const pid of playerIds) {
      voteTallies[pid] = 0;
    }

    const correctVoters: string[] = [];
    const incorrectVoters: string[] = [];

    for (const [voterId, suspectId] of Object.entries(votes)) {
      if (voterId === disruptorId) {
        // Disruptor might also vote to blend in, but doesn't get team accuracy bonus/penalty
        continue;
      }

      if (suspectId === disruptorId) {
        scoreChanges[voterId] = (scoreChanges[voterId] || 0) + SCORING.CORRECT_IDENTIFICATION;
        correctVoters.push(voterId);
      } else {
        scoreChanges[voterId] = (scoreChanges[voterId] || 0) + SCORING.INCORRECT_ACCUSATION;
        incorrectVoters.push(voterId);
      }

      voteTallies[suspectId] = (voteTallies[suspectId] || 0) + 1;
    }

    // Determine if disruptor was caught (has highest or tied-highest vote count, and > 0 votes)
    let maxVotes = 0;
    for (const count of Object.values(voteTallies)) {
      if (count > maxVotes) maxVotes = count;
    }

    const disruptorVoteCount = voteTallies[disruptorId] || 0;
    const disruptorCaught = maxVotes > 0 && disruptorVoteCount === maxVotes;

    if (!disruptorCaught) {
      // Disruptor evaded detection
      scoreChanges[disruptorId] += SCORING.AVOIDED_IDENTIFICATION;
    } else {
      scoreChanges[disruptorId] += SCORING.CAUGHT_IDENTIFICATION;
    }

    return {
      scoreChanges,
      disruptorCaught,
      correctVoters,
      incorrectVoters,
    };
  }

  /**
   * Rank players at the end of the game
   * Tie-break order (Amendment #3):
   * 1. Total individual score (descending)
   * 2. Correct disruptor identifications (descending)
   * 3. Shared rank (same rank for remaining ties, e.g. 1, 1, 3)
   */
  public static rankPlayers(
    players: PublicPlayer[],
    identificationCounts: Record<string, number>
  ): PlayerRankEntry[] {
    const sorted = [...players].sort((a, b) => {
      // 1. Total score
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // 2. Correct disruptor identifications
      const idsA = identificationCounts[a.id] || 0;
      const idsB = identificationCounts[b.id] || 0;
      if (idsB !== idsA) {
        return idsB - idsA;
      }
      // Tied
      return 0;
    });

    // Assign shared ranks
    const ranked: PlayerRankEntry[] = [];
    let currentRank = 1;

    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      const correctIds = identificationCounts[p.id] || 0;

      if (i > 0) {
        const prev = sorted[i - 1];
        const prevIds = identificationCounts[prev.id] || 0;
        const isTied = prev.score === p.score && prevIds === correctIds;

        if (!isTied) {
          currentRank = i + 1;
        }
      }

      ranked.push({
        ...p,
        rank: currentRank,
        correctIdentifications: correctIds,
      });
    }

    return ranked;
  }
}

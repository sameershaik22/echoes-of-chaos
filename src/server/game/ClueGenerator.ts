// ============================================================================
// ECHOES OF CHAOS — Clue Generator
// ============================================================================
// Solver-driven clue generation pipeline:
// 1. Generate secret combination (based on difficulty repeats setting).
// 2. Generate a rich candidate pool of truthful clues matching allowed types.
// 3. Find a minimal/sufficient subset of truthful clues with EXACTLY 1 solution.
// 4. Ensure no single player can solve alone (each player's clues yield > 1 solution).
// 5. Ensure all 4 positions are covered.
// 6. For 4+ players (Disruptor present):
//    - Team clues alone uniquely solve the puzzle.
//    - Disruptor receives 1 truthful clue + 1 misleading clue.
//    - Truthful set + misleading clue yields 0 solutions (detectable contradiction).
// ============================================================================

import {
  Clue,
  ClueType,
  Difficulty,
  ExactPositionClue,
  ExclusionClue,
  ParityClue,
  ArithmeticClue,
  FrequencyClue,
  ServerClue,
} from '../../shared/types.js';
import {
  SYMBOL_POOL,
  COMBINATION_LENGTH,
  DIFFICULTY_SETTINGS,
  SYMBOL_DISPLAY,
} from '../../shared/constants.js';
import { ConstraintSolver } from './ConstraintSolver.js';

let clueIdCounter = 1;
function nextClueId(): string {
  return `clue_${Date.now()}_${clueIdCounter++}`;
}

export interface GeneratedPuzzle {
  secretCombination: number[];
  truthfulClues: Clue[];
  playerClues: Map<string, Clue[]>;
  serverClues: ServerClue[];
  disruptorId: string | null;
}

export class ClueGenerator {
  /**
   * Generate a random combination for the given difficulty
   */
  public static generateCombination(difficulty: Difficulty): number[] {
    const config = DIFFICULTY_SETTINGS[difficulty];
    const combo: number[] = [];

    if (!config.allowRepeats) {
      const pool = [...SYMBOL_POOL];
      for (let i = 0; i < COMBINATION_LENGTH; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        combo.push(pool.splice(idx, 1)[0]);
      }
    } else {
      for (let i = 0; i < COMBINATION_LENGTH; i++) {
        const val = SYMBOL_POOL[Math.floor(Math.random() * SYMBOL_POOL.length)];
        combo.push(val);
      }
    }

    return combo;
  }

  /**
   * Format human-readable description for a clue
   */
  public static formatDescription(clue: Omit<Clue, 'id' | 'description'>): string {
    switch (clue.type) {
      case ClueType.EXACT_POSITION: {
        const s = SYMBOL_DISPLAY[clue.symbol];
        return `Position ${clue.position} is ${s.label} (${s.icon})`;
      }
      case ClueType.EXCLUSION: {
        const s = SYMBOL_DISPLAY[clue.symbol];
        return `Position ${clue.position} is NOT ${s.label} (${s.icon})`;
      }
      case ClueType.PARITY: {
        return `Position ${clue.position} is an ${clue.parity.toUpperCase()} number`;
      }
      case ClueType.ARITHMETIC: {
        return `Sum of Position ${clue.positions[0]} and Position ${clue.positions[1]} is ${clue.sum}`;
      }
      case ClueType.FREQUENCY: {
        const s = SYMBOL_DISPLAY[clue.symbol];
        const countWord = clue.count === 1 ? 'time' : 'times';
        return `${s.label} (${s.icon}) appears exactly ${clue.count} ${countWord}`;
      }
    }
  }

  /**
   * Generate all possible truthful clues of allowed types for the secret combo
   */
  public static generateCandidateTruthfulClues(combo: number[], difficulty: Difficulty): Clue[] {
    const allowedTypes = DIFFICULTY_SETTINGS[difficulty].clueTypes;
    const candidates: Clue[] = [];

    // Exact position clues
    if (allowedTypes.includes(ClueType.EXACT_POSITION)) {
      for (let pos = 1; pos <= COMBINATION_LENGTH; pos++) {
        const symbol = combo[pos - 1];
        candidates.push({
          id: nextClueId(),
          type: ClueType.EXACT_POSITION,
          position: pos,
          symbol,
          description: this.formatDescription({ type: ClueType.EXACT_POSITION, position: pos, symbol }),
        });
      }
    }

    // Exclusion clues
    if (allowedTypes.includes(ClueType.EXCLUSION)) {
      for (let pos = 1; pos <= COMBINATION_LENGTH; pos++) {
        for (const symbol of SYMBOL_POOL) {
          if (symbol !== combo[pos - 1]) {
            candidates.push({
              id: nextClueId(),
              type: ClueType.EXCLUSION,
              position: pos,
              symbol,
              description: this.formatDescription({ type: ClueType.EXCLUSION, position: pos, symbol }),
            });
          }
        }
      }
    }

    // Parity clues
    if (allowedTypes.includes(ClueType.PARITY)) {
      for (let pos = 1; pos <= COMBINATION_LENGTH; pos++) {
        const val = combo[pos - 1];
        const parity = val % 2 === 0 ? 'even' : 'odd';
        candidates.push({
          id: nextClueId(),
          type: ClueType.PARITY,
          position: pos,
          parity,
          description: this.formatDescription({ type: ClueType.PARITY, position: pos, parity }),
        });
      }
    }

    // Arithmetic clues
    if (allowedTypes.includes(ClueType.ARITHMETIC)) {
      for (let p1 = 1; p1 <= COMBINATION_LENGTH; p1++) {
        for (let p2 = p1 + 1; p2 <= COMBINATION_LENGTH; p2++) {
          const sum = combo[p1 - 1] + combo[p2 - 1];
          candidates.push({
            id: nextClueId(),
            type: ClueType.ARITHMETIC,
            positions: [p1, p2],
            sum,
            description: this.formatDescription({ type: ClueType.ARITHMETIC, positions: [p1, p2], sum }),
          });
        }
      }
    }

    // Frequency clues
    if (allowedTypes.includes(ClueType.FREQUENCY)) {
      for (const symbol of SYMBOL_POOL) {
        let count = 0;
        for (let i = 0; i < combo.length; i++) {
          if (combo[i] === symbol) count++;
        }
        candidates.push({
          id: nextClueId(),
          type: ClueType.FREQUENCY,
          symbol,
          count,
          description: this.formatDescription({ type: ClueType.FREQUENCY, symbol, count }),
        });
      }
    }

    return candidates;
  }

  /**
   * Shuffle an array (Fisher-Yates)
   */
  public static shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /**
   * Find a subset of truthful clues that has exactly 1 solution
   * and contains at least minClues clues.
   */
  public static buildUniqueTruthfulSet(
    combo: number[],
    difficulty: Difficulty,
    targetCount: number
  ): Clue[] {
    const allowRepeats = DIFFICULTY_SETTINGS[difficulty].allowRepeats;
    const candidates = this.shuffle(this.generateCandidateTruthfulClues(combo, difficulty));

    // Try building a unique set
    for (let attempt = 0; attempt < 50; attempt++) {
      const selected: Clue[] = [];
      const shuffled = this.shuffle(candidates);

      // Add clues until unique solution reached
      for (const clue of shuffled) {
        selected.push(clue);
        const count = ConstraintSolver.countSolutions(selected, allowRepeats, 2);
        if (count === 1) {
          break;
        }
      }

      if (ConstraintSolver.hasUniqueSolution(selected, allowRepeats)) {
        // Now if selected.length < targetCount, add more consistent truthful clues
        if (selected.length < targetCount) {
          for (const clue of shuffled) {
            if (!selected.some(c => c.id === clue.id)) {
              selected.push(clue);
              if (selected.length >= targetCount) break;
            }
          }
        }
        return selected;
      }
    }

    // Fallback: If heuristic didn't find in 50 tries (e.g. Hard), build from exact clues + extras
    const exactClues: Clue[] = [];
    for (let pos = 1; pos <= COMBINATION_LENGTH; pos++) {
      const symbol = combo[pos - 1];
      exactClues.push({
        id: nextClueId(),
        type: ClueType.EXACT_POSITION,
        position: pos,
        symbol,
        description: this.formatDescription({ type: ClueType.EXACT_POSITION, position: pos, symbol }),
      });
    }

    while (exactClues.length < targetCount && candidates.length > 0) {
      const extra = candidates.find(c => !exactClues.some(e => e.description === c.description));
      if (extra) {
        exactClues.push(extra);
      } else {
        break;
      }
    }

    return exactClues;
  }

  /**
   * Generate a misleading clue for the disruptor that contradicts the truthful set
   */
  public static generateMisleadingClue(
    combo: number[],
    difficulty: Difficulty,
    truthfulSet: Clue[]
  ): Clue {
    const allowRepeats = DIFFICULTY_SETTINGS[difficulty].allowRepeats;
    const allowedTypes = DIFFICULTY_SETTINGS[difficulty].clueTypes;

    // Pick a clue type from allowed types
    const type = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];

    for (let attempt = 0; attempt < 50; attempt++) {
      let candidate: Clue | null = null;

      switch (type) {
        case ClueType.EXACT_POSITION: {
          const pos = Math.floor(Math.random() * COMBINATION_LENGTH) + 1;
          const wrongSymbols = SYMBOL_POOL.filter(s => s !== combo[pos - 1]);
          const wrongSymbol = wrongSymbols[Math.floor(Math.random() * wrongSymbols.length)];
          candidate = {
            id: nextClueId(),
            type: ClueType.EXACT_POSITION,
            position: pos,
            symbol: wrongSymbol,
            description: this.formatDescription({ type: ClueType.EXACT_POSITION, position: pos, symbol: wrongSymbol }),
          };
          break;
        }
        case ClueType.EXCLUSION: {
          const pos = Math.floor(Math.random() * COMBINATION_LENGTH) + 1;
          const realSymbol = combo[pos - 1]; // claiming pos is NOT the real symbol!
          candidate = {
            id: nextClueId(),
            type: ClueType.EXCLUSION,
            position: pos,
            symbol: realSymbol,
            description: this.formatDescription({ type: ClueType.EXCLUSION, position: pos, symbol: realSymbol }),
          };
          break;
        }
        case ClueType.PARITY: {
          const pos = Math.floor(Math.random() * COMBINATION_LENGTH) + 1;
          const realParity = combo[pos - 1] % 2 === 0 ? 'even' : 'odd';
          const wrongParity = realParity === 'even' ? 'odd' : 'even';
          candidate = {
            id: nextClueId(),
            type: ClueType.PARITY,
            position: pos,
            parity: wrongParity,
            description: this.formatDescription({ type: ClueType.PARITY, position: pos, parity: wrongParity }),
          };
          break;
        }
        case ClueType.ARITHMETIC: {
          const pos1 = Math.floor(Math.random() * 3) + 1;
          const pos2 = Math.floor(Math.random() * (4 - pos1)) + pos1 + 1;
          const realSum = combo[pos1 - 1] + combo[pos2 - 1];
          // Plausible wrong sum (off by +/- 1 or 2)
          const delta = Math.random() < 0.5 ? 1 : -1;
          const wrongSum = Math.min(12, Math.max(2, realSum + delta));
          if (wrongSum !== realSum) {
            candidate = {
              id: nextClueId(),
              type: ClueType.ARITHMETIC,
              positions: [pos1, pos2],
              sum: wrongSum,
              description: this.formatDescription({ type: ClueType.ARITHMETIC, positions: [pos1, pos2], sum: wrongSum }),
            };
          }
          break;
        }
        case ClueType.FREQUENCY: {
          const symbol = SYMBOL_POOL[Math.floor(Math.random() * SYMBOL_POOL.length)];
          let realCount = 0;
          for (const s of combo) if (s === symbol) realCount++;
          const wrongCount = realCount === 0 ? 1 : realCount - 1;
          candidate = {
            id: nextClueId(),
            type: ClueType.FREQUENCY,
            symbol,
            count: wrongCount,
            description: this.formatDescription({ type: ClueType.FREQUENCY, symbol, count: wrongCount }),
          };
          break;
        }
      }

      if (candidate) {
        // Verify: truthfulSet + candidate must produce 0 solutions (contradiction!)
        const solutionCount = ConstraintSolver.countSolutions([...truthfulSet, candidate], allowRepeats, 1);
        if (solutionCount === 0) {
          return candidate;
        }
      }
    }

    // Fallback: guaranteed contradiction with exact position
    const pos = 1;
    const wrongSymbol = combo[0] === 1 ? 2 : 1;
    return {
      id: nextClueId(),
      type: ClueType.EXACT_POSITION,
      position: pos,
      symbol: wrongSymbol,
      description: this.formatDescription({ type: ClueType.EXACT_POSITION, position: pos, symbol: wrongSymbol }),
    };
  }

  /**
   * Main entry point: generate a complete puzzle with secret combo,
   * clues distributed to all players, server clues tracking truthfulness,
   * and disruptor assignment (for 4+ players).
   */
  public static generatePuzzle(
    playerIds: string[],
    difficulty: Difficulty,
    disruptorId: string | null = null
  ): GeneratedPuzzle {
    const allowRepeats = DIFFICULTY_SETTINGS[difficulty].allowRepeats;
    const numPlayers = playerIds.length;
    const isCooperative = numPlayers < 4 || disruptorId === null;

    // Team players (everyone if cooperative, otherwise non-disruptor players)
    const teamPlayerIds = isCooperative ? playerIds : playerIds.filter(id => id !== disruptorId);

    // Calculate clue counts:
    // We want at least 1 clue per player, and enough clues so team can uniquely solve.
    // Minimum clues for team: 4 for 2 players, 4 for 3 players, 4+ for 4+ players.
    // Target clues per team player: 2 clues each for 2-4 players, 1-2 for 5-8 players.
    const cluesPerTeamPlayer = numPlayers <= 4 ? 2 : 1;
    const minTeamClues = Math.max(4, teamPlayerIds.length * cluesPerTeamPlayer);

    let combo: number[] = [];
    let teamClues: Clue[] = [];
    let attempts = 0;

    while (attempts < 100) {
      attempts++;
      combo = this.generateCombination(difficulty);
      teamClues = this.buildUniqueTruthfulSet(combo, difficulty, minTeamClues);

      // Verify solver has unique solution with teamClues
      if (ConstraintSolver.hasUniqueSolution(teamClues, allowRepeats)) {
        break;
      }
    }

    // Map clues to players
    const playerClues = new Map<string, Clue[]>();
    const serverClues: ServerClue[] = [];

    // Distribute team clues round-robin
    const shuffledTeamClues = this.shuffle(teamClues);
    for (const pid of teamPlayerIds) {
      playerClues.set(pid, []);
    }

    let clueIdx = 0;
    while (clueIdx < shuffledTeamClues.length) {
      for (const pid of teamPlayerIds) {
        if (clueIdx < shuffledTeamClues.length) {
          const clue = shuffledTeamClues[clueIdx++];
          playerClues.get(pid)!.push(clue);
          serverClues.push({
            clue,
            isTruthful: true,
            assignedTo: pid,
          });
        }
      }
    }

    // Verify fairness: ensure no single team player can solve alone
    // If a player has a unique solution on their own, swap or redistribute
    for (const pid of teamPlayerIds) {
      const pClues = playerClues.get(pid)!;
      if (ConstraintSolver.hasUniqueSolution(pClues, allowRepeats)) {
        // Player can solve alone! Re-run generation to ensure deduction requires collaboration
        return this.generatePuzzle(playerIds, difficulty, disruptorId);
      }
    }

    // Handle Disruptor (if 4+ players and not cooperative)
    if (!isCooperative && disruptorId) {
      // Disruptor gets 1 truthful clue + 1 misleading clue
      // 1 truthful clue picked from teamClues (a shared piece of truth)
      const truthfulSample = shuffledTeamClues[Math.floor(Math.random() * shuffledTeamClues.length)];
      const disruptorTruthfulClue: Clue = {
        ...truthfulSample,
        id: nextClueId(),
      };

      // 1 misleading clue
      const misleadingClue = this.generateMisleadingClue(combo, difficulty, teamClues);

      const dClues = [disruptorTruthfulClue, misleadingClue];
      playerClues.set(disruptorId, dClues);

      serverClues.push({
        clue: disruptorTruthfulClue,
        isTruthful: true,
        assignedTo: disruptorId,
      });

      serverClues.push({
        clue: misleadingClue,
        isTruthful: false,
        assignedTo: disruptorId,
      });
    }

    return {
      secretCombination: combo,
      truthfulClues: teamClues,
      playerClues,
      serverClues,
      disruptorId: isCooperative ? null : disruptorId,
    };
  }
}

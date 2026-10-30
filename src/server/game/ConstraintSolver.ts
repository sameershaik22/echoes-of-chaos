// ============================================================================
// ECHOES OF CHAOS — Constraint Solver
// ============================================================================
// Brute-force CSP solver over symbol pool [1..6] with combination length 4.
// Used to verify that generated truthful clue sets have EXACTLY 1 solution,
// and to check candidate sets against subsets of clues.
// ============================================================================

import { Clue, ClueType } from '../../shared/types.js';
import { SYMBOL_POOL, COMBINATION_LENGTH } from '../../shared/constants.js';

export class ConstraintSolver {
  private static noRepeatCandidates: number[][] = [];
  private static repeatCandidates: number[][] = [];

  static {
    this.generateCandidates();
  }

  private static generateCandidates(): void {
    const symbols = [...SYMBOL_POOL];

    // Permutations without repeats: P(6, 4) = 360
    const noRepeats: number[][] = [];
    const permute = (current: number[], used: Set<number>) => {
      if (current.length === COMBINATION_LENGTH) {
        noRepeats.push([...current]);
        return;
      }
      for (const s of symbols) {
        if (!used.has(s)) {
          used.add(s);
          current.push(s);
          permute(current, used);
          current.pop();
          used.delete(s);
        }
      }
    };
    permute([], new Set<number>());
    this.noRepeatCandidates = noRepeats;

    // Combinations with repeats: 6^4 = 1296
    const repeats: number[][] = [];
    const repeatHelper = (current: number[]) => {
      if (current.length === COMBINATION_LENGTH) {
        repeats.push([...current]);
        return;
      }
      for (const s of symbols) {
        current.push(s);
        repeatHelper(current);
        current.pop();
      }
    };
    repeatHelper([]);
    this.repeatCandidates = repeats;
  }

  /**
   * Get all candidates for a given repeat setting
   */
  public static getCandidates(allowRepeats: boolean): number[][] {
    return allowRepeats ? this.repeatCandidates : this.noRepeatCandidates;
  }

  /**
   * Check whether a single candidate satisfies a clue
   */
  public static satisfiesClue(candidate: number[], clue: Clue): boolean {
    switch (clue.type) {
      case ClueType.EXACT_POSITION: {
        const idx = clue.position - 1;
        return candidate[idx] === clue.symbol;
      }
      case ClueType.EXCLUSION: {
        const idx = clue.position - 1;
        return candidate[idx] !== clue.symbol;
      }
      case ClueType.PARITY: {
        const idx = clue.position - 1;
        const val = candidate[idx];
        return clue.parity === 'even' ? val % 2 === 0 : val % 2 !== 0;
      }
      case ClueType.ARITHMETIC: {
        const idx1 = clue.positions[0] - 1;
        const idx2 = clue.positions[1] - 1;
        return candidate[idx1] + candidate[idx2] === clue.sum;
      }
      case ClueType.FREQUENCY: {
        let count = 0;
        for (let i = 0; i < candidate.length; i++) {
          if (candidate[i] === clue.symbol) count++;
        }
        return count === clue.count;
      }
      default:
        return false;
    }
  }

  /**
   * Check whether candidate satisfies all clues in the set
   */
  public static satisfiesAll(candidate: number[], clues: Clue[]): boolean {
    for (let i = 0; i < clues.length; i++) {
      if (!this.satisfiesClue(candidate, clues[i])) {
        return false;
      }
    }
    return true;
  }

  /**
   * Solve: return all combinations that satisfy all provided clues
   */
  public static solve(clues: Clue[], allowRepeats: boolean): number[][] {
    const candidates = this.getCandidates(allowRepeats);
    const valid: number[][] = [];

    for (let i = 0; i < candidates.length; i++) {
      if (this.satisfiesAll(candidates[i], clues)) {
        valid.push(candidates[i]);
      }
    }

    return valid;
  }

  /**
   * Count how many solutions satisfy the clues (early-exit optimization possible, or full count)
   */
  public static countSolutions(clues: Clue[], allowRepeats: boolean, maxCount = Infinity): number {
    const candidates = this.getCandidates(allowRepeats);
    let count = 0;

    for (let i = 0; i < candidates.length; i++) {
      if (this.satisfiesAll(candidates[i], clues)) {
        count++;
        if (count >= maxCount) return count;
      }
    }

    return count;
  }

  /**
   * Returns true if and only if clues yield exactly one valid solution
   */
  public static hasUniqueSolution(clues: Clue[], allowRepeats: boolean): boolean {
    return this.countSolutions(clues, allowRepeats, 2) === 1;
  }
}

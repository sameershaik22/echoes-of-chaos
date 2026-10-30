import { describe, it, expect } from 'vitest';
import { ConstraintSolver } from '../../src/server/game/ConstraintSolver.js';
import { ClueType, ExactPositionClue, ExclusionClue, ParityClue, ArithmeticClue, FrequencyClue } from '../../src/shared/types.js';

describe('ConstraintSolver', () => {
  it('correctly generates candidates for repeat and no-repeat settings', () => {
    const noRepeats = ConstraintSolver.getCandidates(false);
    expect(noRepeats.length).toBe(360); // P(6, 4)

    const repeats = ConstraintSolver.getCandidates(true);
    expect(repeats.length).toBe(1296); // 6^4
  });

  it('correctly evaluates EXACT_POSITION clue', () => {
    const clue: ExactPositionClue = {
      id: 'c1',
      type: ClueType.EXACT_POSITION,
      position: 1,
      symbol: 3,
      description: 'Pos 1 is 3',
    };
    expect(ConstraintSolver.satisfiesClue([3, 1, 2, 4], clue)).toBe(true);
    expect(ConstraintSolver.satisfiesClue([2, 1, 3, 4], clue)).toBe(false);
  });

  it('correctly evaluates EXCLUSION clue', () => {
    const clue: ExclusionClue = {
      id: 'c2',
      type: ClueType.EXCLUSION,
      position: 2,
      symbol: 5,
      description: 'Pos 2 is NOT 5',
    };
    expect(ConstraintSolver.satisfiesClue([1, 4, 3, 2], clue)).toBe(true);
    expect(ConstraintSolver.satisfiesClue([1, 5, 3, 2], clue)).toBe(false);
  });

  it('correctly evaluates PARITY clue', () => {
    const clueEven: ParityClue = {
      id: 'c3',
      type: ClueType.PARITY,
      position: 3,
      parity: 'even',
      description: 'Pos 3 is even',
    };
    expect(ConstraintSolver.satisfiesClue([1, 2, 4, 5], clueEven)).toBe(true);
    expect(ConstraintSolver.satisfiesClue([1, 2, 3, 5], clueEven)).toBe(false);
  });

  it('correctly evaluates ARITHMETIC clue', () => {
    const clueSum: ArithmeticClue = {
      id: 'c4',
      type: ClueType.ARITHMETIC,
      positions: [1, 4],
      sum: 7,
      description: 'Pos 1 + Pos 4 is 7',
    };
    expect(ConstraintSolver.satisfiesClue([3, 2, 1, 4], clueSum)).toBe(true);
    expect(ConstraintSolver.satisfiesClue([2, 2, 1, 4], clueSum)).toBe(false);
  });

  it('correctly evaluates FREQUENCY clue', () => {
    const clueFreq: FrequencyClue = {
      id: 'c5',
      type: ClueType.FREQUENCY,
      symbol: 2,
      count: 2,
      description: 'Symbol 2 appears 2 times',
    };
    expect(ConstraintSolver.satisfiesClue([2, 1, 2, 4], clueFreq)).toBe(true);
    expect(ConstraintSolver.satisfiesClue([2, 1, 3, 4], clueFreq)).toBe(false);
  });

  it('solves combination uniquely when given 4 exact position clues', () => {
    const clues: ExactPositionClue[] = [
      { id: '1', type: ClueType.EXACT_POSITION, position: 1, symbol: 2, description: '' },
      { id: '2', type: ClueType.EXACT_POSITION, position: 2, symbol: 4, description: '' },
      { id: '3', type: ClueType.EXACT_POSITION, position: 3, symbol: 6, description: '' },
      { id: '4', type: ClueType.EXACT_POSITION, position: 4, symbol: 1, description: '' },
    ];
    const solutions = ConstraintSolver.solve(clues, false);
    expect(solutions.length).toBe(1);
    expect(solutions[0]).toEqual([2, 4, 6, 1]);
    expect(ConstraintSolver.hasUniqueSolution(clues, false)).toBe(true);
  });

  it('detects multiple solutions when constraints are under-specified', () => {
    const clues: ExactPositionClue[] = [
      { id: '1', type: ClueType.EXACT_POSITION, position: 1, symbol: 2, description: '' },
    ];
    const count = ConstraintSolver.countSolutions(clues, false);
    expect(count).toBeGreaterThan(1);
    expect(ConstraintSolver.hasUniqueSolution(clues, false)).toBe(false);
  });
});

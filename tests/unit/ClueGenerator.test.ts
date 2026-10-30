import { describe, it, expect } from 'vitest';
import { ClueGenerator } from '../../src/server/game/ClueGenerator.js';
import { ConstraintSolver } from '../../src/server/game/ConstraintSolver.js';
import { Difficulty } from '../../src/shared/types.js';

describe('ClueGenerator', () => {
  it('generates valid combinations respecting repeat settings', () => {
    // Easy: No repeats
    const easy = ClueGenerator.generateCombination(Difficulty.EASY);
    expect(easy.length).toBe(4);
    expect(new Set(easy).size).toBe(4);

    // Medium: No repeats
    const med = ClueGenerator.generateCombination(Difficulty.MEDIUM);
    expect(med.length).toBe(4);
    expect(new Set(med).size).toBe(4);

    // Hard: Repeats allowed
    const hard = ClueGenerator.generateCombination(Difficulty.HARD);
    expect(hard.length).toBe(4);
  });

  it('generates puzzle with unique solution for cooperative mode (2 players)', () => {
    const puzzle = ClueGenerator.generatePuzzle(['p1', 'p2'], Difficulty.EASY, null);

    expect(puzzle.disruptorId).toBeNull();
    expect(puzzle.secretCombination.length).toBe(4);

    // Truthful clues must uniquely identify secret combo
    const solutions = ConstraintSolver.solve(puzzle.truthfulClues, false);
    expect(solutions.length).toBe(1);
    expect(solutions[0]).toEqual(puzzle.secretCombination);

    // No single player can solve alone (fairness check)
    const p1Clues = puzzle.playerClues.get('p1')!;
    const p2Clues = puzzle.playerClues.get('p2')!;
    expect(ConstraintSolver.countSolutions(p1Clues, false)).toBeGreaterThan(1);
    expect(ConstraintSolver.countSolutions(p2Clues, false)).toBeGreaterThan(1);
  });

  it('generates puzzle with disruptor misleading clue creating a contradiction (4 players)', () => {
    const playerIds = ['p1', 'p2', 'p3', 'p4'];
    const disruptorId = 'p4';
    const puzzle = ClueGenerator.generatePuzzle(playerIds, Difficulty.MEDIUM, disruptorId);

    expect(puzzle.disruptorId).toBe('p4');

    // Team truthful clues uniquely identify secret combo
    const solutions = ConstraintSolver.solve(puzzle.truthfulClues, false);
    expect(solutions.length).toBe(1);
    expect(solutions[0]).toEqual(puzzle.secretCombination);

    // Disruptor gets 2 clues: 1 truthful, 1 misleading
    const disruptorClues = puzzle.playerClues.get(disruptorId)!;
    expect(disruptorClues.length).toBe(2);

    // The misleading clue combined with truthful clues must produce 0 solutions (contradiction!)
    const serverMisleading = puzzle.serverClues.find((sc) => sc.assignedTo === disruptorId && !sc.isTruthful);
    expect(serverMisleading).toBeDefined();

    const contradictionCount = ConstraintSolver.countSolutions(
      [...puzzle.truthfulClues, serverMisleading!.clue],
      false
    );
    expect(contradictionCount).toBe(0);
  });
});

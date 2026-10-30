import { describe, it, expect } from 'vitest';
import { ClueGenerator } from '../../src/server/game/ClueGenerator.js';
import { ConstraintSolver } from '../../src/server/game/ConstraintSolver.js';
import { Difficulty } from '../../src/shared/types.js';

describe('Puzzle Stress Test (500+ Generated Puzzles)', () => {
  const difficulties = [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD];

  it('generates puzzles with guaranteed unique truthful solutions across all difficulties and player counts', () => {
    let totalTested = 0;

    for (const difficulty of difficulties) {
      const allowRepeats = difficulty === Difficulty.HARD;

      // Test player counts from 2 to 8
      for (let playerCount = 2; playerCount <= 8; playerCount++) {
        const playerIds = Array.from({ length: playerCount }, (_, i) => `p_${i + 1}`);
        const disruptorId = playerCount >= 4 ? playerIds[0] : null;

        // Run iterations for each combination
        const iterations = 25; // 3 diffs * 7 player counts * 25 = 525 puzzles tested!
        for (let i = 0; i < iterations; i++) {
          const puzzle = ClueGenerator.generatePuzzle(playerIds, difficulty, disruptorId);
          totalTested++;

          // 1. Truthful clues must yield EXACTLY 1 solution
          const solutions = ConstraintSolver.solve(puzzle.truthfulClues, allowRepeats);
          expect(solutions.length).toBe(1);
          expect(solutions[0]).toEqual(puzzle.secretCombination);

          // 2. Disruptor test (for 4+ players): misleading clue must contradict truthful set
          if (disruptorId) {
            const misleading = puzzle.serverClues.find(
              (sc) => sc.assignedTo === disruptorId && !sc.isTruthful
            );
            expect(misleading).toBeDefined();

            const contradictionSolutions = ConstraintSolver.countSolutions(
              [...puzzle.truthfulClues, misleading!.clue],
              allowRepeats,
              1
            );
            expect(contradictionSolutions).toBe(0);
          }

          // 3. Fairness test: No single team player can solve alone
          const teamIds = disruptorId ? playerIds.filter((id) => id !== disruptorId) : playerIds;
          for (const pid of teamIds) {
            const pClues = puzzle.playerClues.get(pid)!;
            const singlePlayerSolutions = ConstraintSolver.countSolutions(pClues, allowRepeats, 2);
            expect(singlePlayerSolutions).toBeGreaterThan(1);
          }
        }
      }
    }

    expect(totalTested).toBe(525);
  });
});

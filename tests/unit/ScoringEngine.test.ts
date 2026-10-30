import { describe, it, expect } from 'vitest';
import { ScoringEngine } from '../../src/server/game/ScoringEngine.js';
import { SCORING } from '../../src/shared/constants.js';
import { Avatar, PublicPlayer } from '../../src/shared/types.js';

describe('ScoringEngine', () => {
  it('correctly calculates cooperative mode scores', () => {
    // When answer is correct
    const resultWin = ScoringEngine.calculateRoundScores({
      isCooperative: true,
      wasCorrect: true,
      disruptorId: null,
      disruptorDisconnected: false,
      votes: {},
      playerIds: ['p1', 'p2'],
    });

    expect(resultWin.scoreChanges['p1']).toBe(SCORING.CORRECT_COMBINATION);
    expect(resultWin.scoreChanges['p2']).toBe(SCORING.CORRECT_COMBINATION);

    // When answer is incorrect
    const resultLose = ScoringEngine.calculateRoundScores({
      isCooperative: true,
      wasCorrect: false,
      disruptorId: null,
      disruptorDisconnected: false,
      votes: {},
      playerIds: ['p1', 'p2'],
    });

    expect(resultLose.scoreChanges['p1']).toBe(0);
    expect(resultLose.scoreChanges['p2']).toBe(0);
  });

  it('correctly calculates competitive scores with caught disruptor', () => {
    const result = ScoringEngine.calculateRoundScores({
      isCooperative: false,
      wasCorrect: true,
      disruptorId: 'd1',
      disruptorDisconnected: false,
      votes: {
        p1: 'd1', // correct vote
        p2: 'd1', // correct vote
        p3: 'p2', // wrong vote
      },
      playerIds: ['p1', 'p2', 'p3', 'd1'],
    });

    // Team got combo right
    expect(result.scoreChanges['p1']).toBe(SCORING.CORRECT_COMBINATION + SCORING.CORRECT_IDENTIFICATION);
    expect(result.scoreChanges['p2']).toBe(SCORING.CORRECT_COMBINATION + SCORING.CORRECT_IDENTIFICATION);
    expect(result.scoreChanges['p3']).toBe(SCORING.CORRECT_COMBINATION + SCORING.INCORRECT_ACCUSATION);

    // Disruptor was caught
    expect(result.disruptorCaught).toBe(true);
    expect(result.scoreChanges['d1']).toBe(0); // Failed sabotage (0) + caught (0)
  });

  it('correctly calculates competitive scores with successful disruptor sabotage and evasion', () => {
    const result = ScoringEngine.calculateRoundScores({
      isCooperative: false,
      wasCorrect: false,
      disruptorId: 'd1',
      disruptorDisconnected: false,
      votes: {
        p1: 'p2', // wrong
        p2: 'p1', // wrong
        p3: 'p2', // wrong
      },
      playerIds: ['p1', 'p2', 'p3', 'd1'],
    });

    // Team failed combo
    expect(result.scoreChanges['p1']).toBe(SCORING.INCORRECT_ACCUSATION);
    expect(result.scoreChanges['p2']).toBe(SCORING.INCORRECT_ACCUSATION);
    expect(result.scoreChanges['p3']).toBe(SCORING.INCORRECT_ACCUSATION);

    // Disruptor evaded detection and sabotaged
    expect(result.disruptorCaught).toBe(false);
    expect(result.scoreChanges['d1']).toBe(SCORING.SUCCESSFUL_SABOTAGE + SCORING.AVOIDED_IDENTIFICATION);
  });

  it('applies Amendment #9: disruptor disconnect skips voting bonus and does NOT award team bonus', () => {
    const result = ScoringEngine.calculateRoundScores({
      isCooperative: false,
      wasCorrect: true,
      disruptorId: 'd1',
      disruptorDisconnected: true,
      votes: { p1: 'd1', p2: 'd1' },
      playerIds: ['p1', 'p2', 'd1'],
    });

    // Only combination bonus (+500), voting identification skipped (+0)
    expect(result.scoreChanges['p1']).toBe(SCORING.CORRECT_COMBINATION);
    expect(result.scoreChanges['p2']).toBe(SCORING.CORRECT_COMBINATION);
    expect(result.disruptorCaught).toBe(false);
  });

  it('applies Amendment #3 tie-breaking: Total Score -> Disruptor IDs -> Shared Rank', () => {
    const players: PublicPlayer[] = [
      { id: 'p1', name: 'Zack', avatar: Avatar.CYBER_WOLF, isHost: false, isReady: true, isConnected: true, score: 700 },
      { id: 'p2', name: 'Alice', avatar: Avatar.NEON_FOX, isHost: true, isReady: true, isConnected: true, score: 700 },
      { id: 'p3', name: 'Bob', avatar: Avatar.HOLO_OWL, isHost: false, isReady: true, isConnected: true, score: 500 },
    ];

    // p1 has 2 correct IDs, p2 has 1 correct ID
    const identificationCounts = { p1: 2, p2: 1, p3: 0 };
    const ranked = ScoringEngine.rankPlayers(players, identificationCounts);

    expect(ranked[0].id).toBe('p1');
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].id).toBe('p2');
    expect(ranked[1].rank).toBe(2);
    expect(ranked[2].id).toBe('p3');
    expect(ranked[2].rank).toBe(3);

    // If both score and identifications are tied -> shared rank (no alphabetical bias)
    const identificationCountsTied = { p1: 1, p2: 1, p3: 0 };
    const rankedTied = ScoringEngine.rankPlayers(players, identificationCountsTied);

    expect(rankedTied[0].rank).toBe(1);
    expect(rankedTied[1].rank).toBe(1); // Shared rank 1!
    expect(rankedTied[2].rank).toBe(3); // Next rank is 3
  });
});

import { describe, it, expect } from 'vitest';
import {
  calculateNextPowerOfTwo,
  calculateTotalRounds,
  getNextRoundPosition,
  generateBracketPlan,
} from '../../src/utils/bracket-calculator.js';

describe('Bracket Calculator Unit Tests', () => {
  describe('calculateNextPowerOfTwo', () => {
    it('returns 2 for n <= 2', () => {
      expect(calculateNextPowerOfTwo(0)).toBe(2);
      expect(calculateNextPowerOfTwo(1)).toBe(2);
      expect(calculateNextPowerOfTwo(2)).toBe(2);
    });

    it('returns exact power of two if already a power of two', () => {
      expect(calculateNextPowerOfTwo(4)).toBe(4);
      expect(calculateNextPowerOfTwo(8)).toBe(8);
      expect(calculateNextPowerOfTwo(16)).toBe(16);
    });

    it('returns next higher power of two for non-power-of-two numbers', () => {
      expect(calculateNextPowerOfTwo(3)).toBe(4);
      expect(calculateNextPowerOfTwo(5)).toBe(8);
      expect(calculateNextPowerOfTwo(6)).toBe(8);
      expect(calculateNextPowerOfTwo(7)).toBe(8);
      expect(calculateNextPowerOfTwo(9)).toBe(16);
      expect(calculateNextPowerOfTwo(13)).toBe(16);
    });
  });

  describe('calculateTotalRounds', () => {
    it('calculates log2 of powers of two accurately', () => {
      expect(calculateTotalRounds(2)).toBe(1);
      expect(calculateTotalRounds(4)).toBe(2);
      expect(calculateTotalRounds(8)).toBe(3);
      expect(calculateTotalRounds(16)).toBe(4);
    });
  });

  describe('getNextRoundPosition', () => {
    it('correctly maps odd positions to slot A of next round', () => {
      expect(getNextRoundPosition(1, 1)).toEqual({
        roundNumber: 2,
        position: 1,
        slot: 'A',
      });
      expect(getNextRoundPosition(1, 3)).toEqual({
        roundNumber: 2,
        position: 2,
        slot: 'A',
      });
    });

    it('correctly maps even positions to slot B of next round', () => {
      expect(getNextRoundPosition(1, 2)).toEqual({
        roundNumber: 2,
        position: 1,
        slot: 'B',
      });
      expect(getNextRoundPosition(1, 4)).toEqual({
        roundNumber: 2,
        position: 2,
        slot: 'B',
      });
    });
  });

  describe('generateBracketPlan - Various Contestant Counts', () => {
    it('rejects less than 2 contestants', () => {
      expect(() => generateBracketPlan(['c1'])).toThrow(
        'A tournament requires at least 2 contestants to generate a bracket'
      );
    });

    it('generates a 2-contestant bracket (1 round, 0 byes)', () => {
      const plan = generateBracketPlan(['c1', 'c2']);
      expect(plan.totalContestants).toBe(2);
      expect(plan.powerOfTwo).toBe(2);
      expect(plan.totalRounds).toBe(1);
      expect(plan.totalByes).toBe(0);
      expect(plan.round1Matchups).toHaveLength(1);
      expect(plan.round1Matchups[0]).toEqual({
        roundNumber: 1,
        position: 1,
        contestantAId: 'c1',
        contestantBId: 'c2',
        isBye: false,
        autoWinnerId: null,
      });
      expect(plan.subsequentRoundMatchups).toHaveLength(0);
      expect(plan.advancements).toHaveLength(0);
    });

    it('generates a 3-contestant bracket (2 rounds, 1 bye, 1 real match)', () => {
      const plan = generateBracketPlan(['c1', 'c2', 'c3']);
      expect(plan.totalContestants).toBe(3);
      expect(plan.powerOfTwo).toBe(4);
      expect(plan.totalRounds).toBe(2);
      expect(plan.totalByes).toBe(1);
      expect(plan.round1Matchups).toHaveLength(2);

      // Matchup 1: Real match
      expect(plan.round1Matchups[0].isBye).toBe(false);
      expect(plan.round1Matchups[0].contestantAId).toBe('c1');
      expect(plan.round1Matchups[0].contestantBId).toBe('c2');

      // Matchup 2: Bye
      expect(plan.round1Matchups[1].isBye).toBe(true);
      expect(plan.round1Matchups[1].contestantAId).toBe('c3');
      expect(plan.round1Matchups[1].contestantBId).toBeNull();
      expect(plan.round1Matchups[1].autoWinnerId).toBe('c3');

      // Check auto-advancement into Round 2
      expect(plan.advancements).toHaveLength(1);
      expect(plan.advancements[0]).toEqual({
        contestantId: 'c3',
        fromRound: 1,
        fromPosition: 2,
        toRound: 2,
        toPosition: 1,
        toSlot: 'B',
      });

      // Subsequent rounds: Round 2 has 1 matchup (Finals)
      expect(plan.subsequentRoundMatchups).toHaveLength(1);
      expect(plan.subsequentRoundMatchups[0].roundNumber).toBe(2);
      expect(plan.subsequentRoundMatchups[0].position).toBe(1);
      expect(plan.subsequentRoundMatchups[0].contestantAId).toBeNull(); // To be populated by winner of Match 1
      expect(plan.subsequentRoundMatchups[0].contestantBId).toBe('c3'); // Pre-populated by bye!
    });

    it('generates a 5-contestant bracket (4 first-round slots, 3 byes, 1 real match, 3 rounds)', () => {
      const plan = generateBracketPlan(['c1', 'c2', 'c3', 'c4', 'c5']);
      expect(plan.totalContestants).toBe(5);
      expect(plan.powerOfTwo).toBe(8);
      expect(plan.totalRounds).toBe(3);
      expect(plan.totalByes).toBe(3);

      // 4 first-round slots
      expect(plan.round1Matchups).toHaveLength(4);

      // 1 real match
      expect(plan.round1Matchups[0].isBye).toBe(false);
      expect(plan.round1Matchups[0].contestantAId).toBe('c1');
      expect(plan.round1Matchups[0].contestantBId).toBe('c2');

      // 3 bye matches
      expect(plan.round1Matchups[1].isBye).toBe(true);
      expect(plan.round1Matchups[1].contestantAId).toBe('c3');
      expect(plan.round1Matchups[1].autoWinnerId).toBe('c3');

      expect(plan.round1Matchups[2].isBye).toBe(true);
      expect(plan.round1Matchups[2].contestantAId).toBe('c4');
      expect(plan.round1Matchups[2].autoWinnerId).toBe('c4');

      expect(plan.round1Matchups[3].isBye).toBe(true);
      expect(plan.round1Matchups[3].contestantAId).toBe('c5');
      expect(plan.round1Matchups[3].autoWinnerId).toBe('c5');

      // Ensure no contestant receives multiple byes in the same round
      const byeContestants = plan.round1Matchups
        .filter((m) => m.isBye)
        .map((m) => m.contestantAId);
      const uniqueByeContestants = new Set(byeContestants);
      expect(uniqueByeContestants.size).toBe(3);

      // Total subsequent round matchups: Round 2 (2 matchups) + Round 3 (1 matchup) = 3
      expect(plan.subsequentRoundMatchups).toHaveLength(3);

      // Check Round 2 pre-seeding from byes
      const r2p1 = plan.subsequentRoundMatchups.find((m) => m.roundNumber === 2 && m.position === 1);
      const r2p2 = plan.subsequentRoundMatchups.find((m) => m.roundNumber === 2 && m.position === 2);

      expect(r2p1?.contestantBId).toBe('c3'); // Advanced from position 2
      expect(r2p2?.contestantAId).toBe('c4'); // Advanced from position 3
      expect(r2p2?.contestantBId).toBe('c5'); // Advanced from position 4
    });

    it('generates an 8-contestant bracket (4 real matches, 0 byes, 3 rounds)', () => {
      const contestants = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'];
      const plan = generateBracketPlan(contestants);
      expect(plan.totalContestants).toBe(8);
      expect(plan.powerOfTwo).toBe(8);
      expect(plan.totalRounds).toBe(3);
      expect(plan.totalByes).toBe(0);
      expect(plan.round1Matchups).toHaveLength(4);
      expect(plan.round1Matchups.every((m) => !m.isBye)).toBe(true);
      expect(plan.advancements).toHaveLength(0);

      // Round 2 (2 matchups) + Round 3 (1 matchup)
      expect(plan.subsequentRoundMatchups).toHaveLength(3);
    });

    it('handles odd contestant counts deterministically (e.g. 7 contestants: 1 bye, 3 real matches)', () => {
      const contestants = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'];
      const plan = generateBracketPlan(contestants);
      expect(plan.totalContestants).toBe(7);
      expect(plan.powerOfTwo).toBe(8);
      expect(plan.totalByes).toBe(1);
      expect(plan.round1Matchups).toHaveLength(4);

      const byeMatches = plan.round1Matchups.filter((m) => m.isBye);
      const realMatches = plan.round1Matchups.filter((m) => !m.isBye);
      expect(byeMatches).toHaveLength(1);
      expect(realMatches).toHaveLength(3);
      expect(byeMatches[0].contestantAId).toBe('c7');
    });
  });
});

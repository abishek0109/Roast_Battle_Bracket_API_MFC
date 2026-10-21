import { describe, it, expect } from 'vitest';

describe('Business Rules Logic Unit Tests', () => {
  describe('Self-Voting Rule', () => {
    function isSelfVote(voterId: string, voterEmail: string, contestant: { id: string; userId: string | null; email: string }) {
      return contestant.userId === voterId || contestant.email === voterEmail;
    }

    it('identifies self-voting when voter userId matches contestant userId', () => {
      const contestant = { id: 'c1', userId: 'u1', email: 'c1@test.com' };
      expect(isSelfVote('u1', 'other@test.com', contestant)).toBe(true);
    });

    it('identifies self-voting when voter email matches contestant email', () => {
      const contestant = { id: 'c1', userId: null, email: 'c1@test.com' };
      expect(isSelfVote('u2', 'c1@test.com', contestant)).toBe(true);
    });

    it('allows voting when voter is an unrelated user', () => {
      const contestant = { id: 'c1', userId: 'u1', email: 'c1@test.com' };
      expect(isSelfVote('u99', 'voter@test.com', contestant)).toBe(false);
    });
  });

  describe('Participant Validation Rule', () => {
    function isParticipant(targetId: string, matchup: { contestantAId: string | null; contestantBId: string | null }) {
      return matchup.contestantAId === targetId || matchup.contestantBId === targetId;
    }

    it('accepts contestant A and contestant B', () => {
      const matchup = { contestantAId: 'c1', contestantBId: 'c2' };
      expect(isParticipant('c1', matchup)).toBe(true);
      expect(isParticipant('c2', matchup)).toBe(true);
    });

    it('rejects an outsider contestant', () => {
      const matchup = { contestantAId: 'c1', contestantBId: 'c2' };
      expect(isParticipant('c99', matchup)).toBe(false);
    });
  });

  describe('Deadline Enforcement Rule', () => {
    function isVotingOpen(now: Date, opensAt: Date | null, closesAt: Date | null) {
      if (!opensAt || !closesAt) return false;
      return now >= opensAt && now < closesAt;
    }

    it('allows voting strictly inside the window', () => {
      const opensAt = new Date('2026-10-21T10:00:00Z');
      const closesAt = new Date('2026-10-21T10:05:00Z');

      const before = new Date('2026-10-21T09:59:59Z');
      const inside = new Date('2026-10-21T10:02:30Z');
      const atClose = new Date('2026-10-21T10:05:00Z');
      const after = new Date('2026-10-21T10:05:01Z');

      expect(isVotingOpen(before, opensAt, closesAt)).toBe(false);
      expect(isVotingOpen(inside, opensAt, closesAt)).toBe(true);
      expect(isVotingOpen(atClose, opensAt, closesAt)).toBe(false); // Exactly at closing is closed
      expect(isVotingOpen(after, opensAt, closesAt)).toBe(false);
    });
  });

  describe('Winner Determination and Tie Detection', () => {
    function evaluateVotes(votesA: number, votesB: number) {
      if (votesA > votesB) return { isTie: false, winner: 'A' };
      if (votesB > votesA) return { isTie: false, winner: 'B' };
      return { isTie: true, winner: null };
    }

    it('detects ties when votes are equal', () => {
      expect(evaluateVotes(0, 0)).toEqual({ isTie: true, winner: null });
      expect(evaluateVotes(15, 15)).toEqual({ isTie: true, winner: null });
    });

    it('correctly declares contestant A when A has more votes', () => {
      expect(evaluateVotes(10, 8)).toEqual({ isTie: false, winner: 'A' });
    });

    it('correctly declares contestant B when B has more votes', () => {
      expect(evaluateVotes(7, 12)).toEqual({ isTie: false, winner: 'B' });
    });
  });
});

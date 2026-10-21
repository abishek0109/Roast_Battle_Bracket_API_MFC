import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema } from '../../src/modules/auth/auth.schema.js';
import { submitRoastLineSchema, updateRoastLineSchema } from '../../src/modules/matchups/matchups.schema.js';
import { createTournamentSchema } from '../../src/modules/tournaments/tournaments.schema.js';
import { createContestantSchema } from '../../src/modules/contestants/contestants.schema.js';
import { submitVoteSchema } from '../../src/modules/votes/votes.schema.js';

describe('Zod Validation Schemas Unit Tests', () => {
  describe('registerSchema', () => {
    it('accepts valid registration input', () => {
      const valid = {
        name: 'Dave Chappelle',
        email: 'dave@comedy.com',
        password: 'superSecretPassword1',
        role: 'CONTESTANT',
      };
      const result = registerSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const invalid = {
        name: 'Dave',
        email: 'not-an-email',
        password: 'password123',
      };
      const result = registerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects short passwords (< 6 chars)', () => {
      const invalid = {
        name: 'Dave',
        email: 'dave@comedy.com',
        password: '123',
      };
      const result = registerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('submitRoastLineSchema', () => {
    it('accepts valid roast line content', () => {
      const valid = {
        content: 'Your comedy specials look like infomercials for sadness.',
      };
      const result = submitRoastLineSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects roast lines shorter than 5 characters or whitespace only', () => {
      expect(submitRoastLineSchema.safeParse({ content: 'hi' }).success).toBe(false);
      expect(submitRoastLineSchema.safeParse({ content: '     ' }).success).toBe(false);
      expect(submitRoastLineSchema.safeParse({ content: '' }).success).toBe(false);
    });

    it('rejects roast lines exceeding 500 characters', () => {
      const excessive = 'A'.repeat(501);
      expect(submitRoastLineSchema.safeParse({ content: excessive }).success).toBe(false);
    });
  });

  describe('createTournamentSchema', () => {
    it('applies default 300 seconds voting duration', () => {
      const parsed = createTournamentSchema.parse({ name: 'Summer Roast' });
      expect(parsed.votingDurationSeconds).toBe(300);
    });

    it('rejects voting duration less than 10 seconds', () => {
      const result = createTournamentSchema.safeParse({
        name: 'Summer Roast',
        votingDurationSeconds: 5,
      });
      expect(result.success).toBe(false);
    });

    it('rejects tournament names shorter than 3 characters', () => {
      expect(createTournamentSchema.safeParse({ name: 'AB' }).success).toBe(false);
    });
  });

  describe('createContestantSchema', () => {
    it('accepts valid contestant registration', () => {
      const valid = {
        displayName: 'The Roaster',
        email: 'roaster@battle.com',
      };
      const result = createContestantSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const invalid = {
        displayName: 'The Roaster',
        email: 'invalid-email',
      };
      expect(createContestantSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('submitVoteSchema', () => {
    it('accepts valid UUID contestantId', () => {
      const valid = {
        contestantId: '123e4567-e89b-12d3-a456-426614174000',
      };
      expect(submitVoteSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects non-UUID contestantId', () => {
      const invalid = {
        contestantId: 'not-a-uuid',
      };
      expect(submitVoteSchema.safeParse(invalid).success).toBe(false);
    });
  });
});

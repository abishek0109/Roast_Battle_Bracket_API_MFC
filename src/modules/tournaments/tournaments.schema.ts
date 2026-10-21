import { z } from 'zod';
import { TournamentStatus } from '../../types/index.js';

export const createTournamentSchema = z.object({
  name: z.string().trim().min(3, 'Tournament name must be at least 3 characters long').max(100),
  votingDurationSeconds: z.coerce
    .number()
    .int()
    .min(10, 'Voting duration must be at least 10 seconds')
    .max(86400, 'Voting duration cannot exceed 24 hours')
    .optional()
    .default(300),
});

export const updateTournamentSchema = z.object({
  name: z.string().trim().min(3).max(100).optional(),
  votingDurationSeconds: z.coerce.number().int().min(10).max(86400).optional(),
  status: z.nativeEnum(TournamentStatus).optional(),
});

export const tournamentIdParamSchema = z.object({
  id: z.string().uuid('Invalid tournament ID format'),
});

export const enrollContestantSchema = z.object({
  contestantId: z.string().uuid('Invalid contestant ID format'),
  seed: z.coerce.number().int().min(1).optional(),
});

export const listTournamentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.nativeEnum(TournamentStatus).optional(),
});

export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;
export type UpdateTournamentInput = z.infer<typeof updateTournamentSchema>;
export type EnrollContestantInput = z.infer<typeof enrollContestantSchema>;

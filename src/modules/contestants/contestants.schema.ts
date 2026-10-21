import { z } from 'zod';

export const createContestantSchema = z.object({
  displayName: z.string().trim().min(2, 'Display name must be at least 2 characters long').max(100),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  userId: z.string().uuid().optional(),
  tournamentId: z.string().uuid().optional(),
});

export const updateContestantSchema = z.object({
  displayName: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
});

export const contestantIdParamSchema = z.object({
  id: z.string().uuid('Invalid contestant ID format'),
});

export const listContestantsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().trim().optional(),
  tournamentId: z.string().uuid().optional(),
});

export type CreateContestantInput = z.infer<typeof createContestantSchema>;
export type UpdateContestantInput = z.infer<typeof updateContestantSchema>;

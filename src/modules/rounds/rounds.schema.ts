import { z } from 'zod';

export const advanceRoundSchema = z.object({
  tournamentId: z.string().uuid('Invalid tournament ID format').optional(),
  matchupId: z.string().uuid('Invalid matchup ID format').optional(),
  roundNumber: z.coerce.number().int().min(1).optional(),
}).refine(data => data.tournamentId || data.matchupId, {
  message: 'Either tournamentId or matchupId must be provided',
});

export type AdvanceRoundInput = z.infer<typeof advanceRoundSchema>;

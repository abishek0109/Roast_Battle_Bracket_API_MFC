import { z } from 'zod';

export const voteParamSchema = z.object({
  matchupId: z.string().uuid('Invalid matchup ID format'),
});

export const submitVoteSchema = z.object({
  contestantId: z.string().uuid('Invalid contestant ID format'),
});

export type SubmitVoteInput = z.infer<typeof submitVoteSchema>;

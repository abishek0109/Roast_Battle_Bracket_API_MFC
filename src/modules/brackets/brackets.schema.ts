import { z } from 'zod';

export const generateBracketSchema = z.object({
  tournamentId: z.string().uuid('Invalid tournament ID format'),
});

export const getBracketParamsSchema = z.object({
  tournamentId: z.string().uuid('Invalid tournament ID format'),
});

export type GenerateBracketInput = z.infer<typeof generateBracketSchema>;

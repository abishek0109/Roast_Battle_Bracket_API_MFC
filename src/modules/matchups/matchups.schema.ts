import { z } from 'zod';

export const matchupIdParamSchema = z.object({
  id: z.string().uuid('Invalid matchup ID format'),
});

export const matchupParamSchema = z.object({
  matchupId: z.string().uuid('Invalid matchup ID format'),
});

export const roastLineIdParamSchema = z.object({
  id: z.string().uuid('Invalid roast line ID format'),
});

export const submitRoastLineSchema = z.object({
  content: z
    .string()
    .trim()
    .min(5, 'Roast line must be at least 5 characters long')
    .max(500, 'Roast line cannot exceed 500 characters'),
  contestantId: z.string().uuid('Invalid contestant ID format').optional(),
});

export const updateRoastLineSchema = z.object({
  content: z
    .string()
    .trim()
    .min(5, 'Roast line must be at least 5 characters long')
    .max(500, 'Roast line cannot exceed 500 characters'),
});

export const initiateTiebreakSchema = z.object({
  force: z.boolean().optional().default(false),
  durationSeconds: z.coerce.number().int().min(10).max(86400).optional(),
});

export type SubmitRoastLineInput = z.infer<typeof submitRoastLineSchema>;
export type UpdateRoastLineInput = z.infer<typeof updateRoastLineSchema>;
export type InitiateTiebreakInput = z.infer<typeof initiateTiebreakSchema>;

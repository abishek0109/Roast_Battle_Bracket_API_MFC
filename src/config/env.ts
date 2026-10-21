import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/roast_battle?schema=public'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters long').default('super-secret-jwt-key-change-in-production-min-32-chars-long'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.string().default('development'),
  CORS_ORIGIN: z.string().default('*'),
  VOTING_DURATION_SECONDS: z.coerce.number().min(10).default(300),
  MATCHUP_SCHEDULER_INTERVAL_MS: z.coerce.number().min(500).default(3000),
  ALLOW_LIVE_VOTE_COUNTS: z.coerce.boolean().default(false),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().optional().default(2525),
  SMTP_SECURE: z.coerce.boolean().optional().default(false),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('roastmaster@bracket.battle'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsed.error.format(), null, 2));
  throw new Error('Environment variable validation failed');
}

export const env = parsed.data;

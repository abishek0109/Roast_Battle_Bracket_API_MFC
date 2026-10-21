import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    env.NODE_ENV !== 'production' && env.NODE_ENV !== 'test'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'yyyy-mm-dd HH:MM:ss',
          },
        }
      : undefined,
  redact: {
    paths: ['req.headers.authorization', 'password', 'passwordHash', 'token', 'SMTP_PASS', 'jwt'],
    censor: '[REDACTED]',
  },
});

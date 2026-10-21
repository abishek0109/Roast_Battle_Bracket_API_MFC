import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors.js';
import { ApiResponse } from '../utils/api-response.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  // Handle known AppError
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, path: req.path, method: req.method }, 'Application Error');
    } else {
      logger.warn({ err: err.message, code: err.code, path: req.path, method: req.method }, 'Handled Client Error');
    }
    ApiResponse.error(res, err.message, err.statusCode, err.code, err.details);
    return;
  }

  // Handle Prisma Database Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    logger.warn({ code: err.code, meta: err.meta, path: req.path }, 'Prisma Known Request Error');

    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[]) || [];
        const fieldMsg = target.length > 0 ? ` on field (${target.join(', ')})` : '';
        ApiResponse.error(
          res,
          `Unique constraint violation${fieldMsg}. A duplicate record already exists.`,
          409,
          'DUPLICATE_RECORD',
          { target: err.meta?.target }
        );
        return;
      }
      case 'P2025': {
        ApiResponse.error(res, 'Record not found in database', 404, 'RECORD_NOT_FOUND');
        return;
      }
      case 'P2003': {
        ApiResponse.error(res, 'Foreign key constraint failed', 400, 'FOREIGN_KEY_VIOLATION');
        return;
      }
      default: {
        ApiResponse.error(res, 'Database operation failed', 400, 'DATABASE_ERROR', {
          code: err.code,
        });
        return;
      }
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.warn({ err: err.message }, 'Prisma Validation Error');
    ApiResponse.error(res, 'Database query validation error', 400, 'DATABASE_VALIDATION_ERROR');
    return;
  }

  // Handle SyntaxError (e.g. malformed JSON in request body)
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) {
    ApiResponse.error(res, 'Malformed JSON in request body', 400, 'INVALID_JSON');
    return;
  }

  // Unhandled / Internal Server Error
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled Exception');
  const message = env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  ApiResponse.error(res, message, 500, 'INTERNAL_SERVER_ERROR');
};

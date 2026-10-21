import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/crypto.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { Role } from '../types/index.js';

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    throw new UnauthorizedError('Bearer token is empty');
  }

  const payload = verifyToken(token);
  req.user = payload;
  next();
};

export const optionalAuthenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      try {
        req.user = verifyToken(token);
      } catch {
        // Ignore invalid token for optional auth
      }
    }
  }
  next();
};

export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(`User role '${req.user.role}' is not authorized for this action`);
    }

    next();
  };
};

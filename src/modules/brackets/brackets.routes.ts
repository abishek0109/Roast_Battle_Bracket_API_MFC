import { Router } from 'express';
import { bracketsController } from './brackets.controller.js';
import { validateBody, validateParams } from '../../middleware/validation.middleware.js';
import { generateBracketSchema, getBracketParamsSchema } from './brackets.schema.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { Role } from '../../types/index.js';

const router = Router();

// Admin can generate bracket
router.post(
  '/generate',
  authenticate,
  requireRole(Role.ADMIN),
  validateBody(generateBracketSchema),
  bracketsController.generateBracket
);

// Public full bracket view
router.get(
  '/:tournamentId',
  validateParams(getBracketParamsSchema),
  bracketsController.getBracket
);

export default router;

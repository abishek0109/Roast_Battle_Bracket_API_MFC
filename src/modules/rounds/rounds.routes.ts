import { Router } from 'express';
import { roundsController } from './rounds.controller.js';
import { validateBody } from '../../middleware/validation.middleware.js';
import { advanceRoundSchema } from './rounds.schema.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { Role } from '../../types/index.js';

const router = Router();

router.post(
  '/advance',
  authenticate,
  requireRole(Role.ADMIN),
  validateBody(advanceRoundSchema),
  roundsController.advanceRound
);

export default router;

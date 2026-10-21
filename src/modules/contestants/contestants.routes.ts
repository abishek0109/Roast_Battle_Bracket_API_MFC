import { Router } from 'express';
import { contestantsController } from './contestants.controller.js';
import { validateBody, validateParams, validateQuery } from '../../middleware/validation.middleware.js';
import {
  createContestantSchema,
  updateContestantSchema,
  contestantIdParamSchema,
  listContestantsQuerySchema,
} from './contestants.schema.js';
import { authenticate, requireRole, optionalAuthenticate } from '../../middleware/auth.middleware.js';
import { Role } from '../../types/index.js';

const router = Router();

// Public listing and retrieval
router.get('/', validateQuery(listContestantsQuerySchema), contestantsController.getContestants);
router.get('/:id', validateParams(contestantIdParamSchema), contestantsController.getContestantById);
router.get('/:id/history', validateParams(contestantIdParamSchema), contestantsController.getContestantHistory);

// Protected mutation routes
router.post(
  '/',
  optionalAuthenticate,
  validateBody(createContestantSchema),
  contestantsController.createContestant
);

router.patch(
  '/:id',
  authenticate,
  validateParams(contestantIdParamSchema),
  validateBody(updateContestantSchema),
  contestantsController.updateContestant
);

router.delete(
  '/:id',
  authenticate,
  validateParams(contestantIdParamSchema),
  contestantsController.deleteContestant
);

export default router;

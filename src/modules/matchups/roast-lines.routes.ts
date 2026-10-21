import { Router } from 'express';
import { matchupsController } from './matchups.controller.js';
import { validateBody, validateParams } from '../../middleware/validation.middleware.js';
import { roastLineIdParamSchema, updateRoastLineSchema } from './matchups.schema.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

router.patch(
  '/:id',
  authenticate,
  validateParams(roastLineIdParamSchema),
  validateBody(updateRoastLineSchema),
  matchupsController.updateRoastLine
);

router.delete(
  '/:id',
  authenticate,
  validateParams(roastLineIdParamSchema),
  matchupsController.deleteRoastLine
);

export default router;

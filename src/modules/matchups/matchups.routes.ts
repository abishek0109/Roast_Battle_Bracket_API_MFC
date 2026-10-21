import { Router } from 'express';
import { matchupsController } from './matchups.controller.js';
import { validateBody, validateParams } from '../../middleware/validation.middleware.js';
import {
  matchupIdParamSchema,
  matchupParamSchema,
  roastLineIdParamSchema,
  submitRoastLineSchema,
  updateRoastLineSchema,
  initiateTiebreakSchema,
} from './matchups.schema.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

// Matchup Status and Results (Public)
router.get('/:id/status', validateParams(matchupIdParamSchema), matchupsController.getMatchupStatus);
router.get('/:id/results', validateParams(matchupIdParamSchema), matchupsController.getMatchupResults);

// Roast Line Submissions for a Matchup
router.post(
  '/:matchupId/roast-lines',
  authenticate,
  validateParams(matchupParamSchema),
  validateBody(submitRoastLineSchema),
  matchupsController.submitRoastLine
);

router.get(
  '/:matchupId/roast-lines',
  validateParams(matchupParamSchema),
  matchupsController.getRoastLines
);

// Tiebreak Management
router.post(
  '/:id/tiebreak',
  authenticate,
  validateParams(matchupIdParamSchema),
  validateBody(initiateTiebreakSchema),
  matchupsController.initiateTiebreak
);

export default router;

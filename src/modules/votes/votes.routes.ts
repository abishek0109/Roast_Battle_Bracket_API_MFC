import { Router } from 'express';
import { votesController } from './votes.controller.js';
import { validateBody, validateParams } from '../../middleware/validation.middleware.js';
import { voteParamSchema, submitVoteSchema } from './votes.schema.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { voteRateLimiter } from '../../middleware/rate-limit.middleware.js';

const router = Router();

router.post(
  '/:matchupId',
  authenticate,
  voteRateLimiter,
  validateParams(voteParamSchema),
  validateBody(submitVoteSchema),
  votesController.submitVote
);

export default router;

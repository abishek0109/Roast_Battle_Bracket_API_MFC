import { Router } from 'express';
import { tournamentsController } from './tournaments.controller.js';
import { validateBody, validateParams, validateQuery } from '../../middleware/validation.middleware.js';
import {
  createTournamentSchema,
  updateTournamentSchema,
  tournamentIdParamSchema,
  enrollContestantSchema,
  listTournamentsQuerySchema,
} from './tournaments.schema.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { Role } from '../../types/index.js';

const router = Router();

// Public routes
router.get('/', validateQuery(listTournamentsQuerySchema), tournamentsController.getTournaments);
router.get('/:id', validateParams(tournamentIdParamSchema), tournamentsController.getTournamentById);
router.get('/:id/winner', validateParams(tournamentIdParamSchema), tournamentsController.getTournamentWinner);

// Admin-protected routes
router.post(
  '/',
  authenticate,
  requireRole(Role.ADMIN),
  validateBody(createTournamentSchema),
  tournamentsController.createTournament
);

router.patch(
  '/:id',
  authenticate,
  requireRole(Role.ADMIN),
  validateParams(tournamentIdParamSchema),
  validateBody(updateTournamentSchema),
  tournamentsController.updateTournament
);

router.post(
  '/:id/contestants',
  authenticate,
  requireRole(Role.ADMIN),
  validateParams(tournamentIdParamSchema),
  validateBody(enrollContestantSchema),
  tournamentsController.enrollContestant
);

export default router;

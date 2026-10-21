import { prisma } from '../../config/database.js';
import { matchupsService } from '../matchups/matchups.service.js';
import { NotFoundError } from '../../utils/errors.js';
import { AdvanceRoundInput } from './rounds.schema.js';

export class RoundsService {
  /**
   * Advances eligible matchups by strictly validating deadlines and vote totals from the database.
   * Clients cannot arbitrarily declare winners.
   */
  public async advanceRound(input: AdvanceRoundInput) {
    if (input.matchupId) {
      const result = await matchupsService.finalizeMatchup(input.matchupId);
      return {
        processedMatchups: [result],
      };
    }

    if (input.tournamentId) {
      const tournament = await prisma.tournament.findUnique({
        where: { id: input.tournamentId },
      });

      if (!tournament) {
        throw new NotFoundError('Tournament not found');
      }

      const whereClause: any = {
        tournamentId: input.tournamentId,
        status: 'OPEN',
      };

      if (input.roundNumber) {
        whereClause.roundNumber = input.roundNumber;
      }

      const openMatchups = await prisma.matchup.findMany({
        where: whereClause,
      });

      const results = [];
      for (const m of openMatchups) {
        const res = await matchupsService.finalizeMatchup(m.id);
        results.push(res);
      }

      return {
        tournamentId: input.tournamentId,
        totalEvaluated: openMatchups.length,
        processedMatchups: results,
      };
    }

    return { processedMatchups: [] };
  }
}

export const roundsService = new RoundsService();

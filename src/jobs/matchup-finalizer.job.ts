import { prisma } from '../config/database.js';
import { matchupsService } from '../modules/matchups/matchups.service.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

export class MatchupFinalizerScheduler {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  public start(): void {
    if (this.timer) return;

    logger.info(
      { intervalMs: env.MATCHUP_SCHEDULER_INTERVAL_MS },
      'Starting Matchup Finalizer Scheduler'
    );

    // Run an immediate sweep on startup to catch up any matchups that expired while server was offline
    this.pollExpiredMatchups().catch((err) => {
      logger.error({ err }, 'Error during initial matchup sweep on startup');
    });

    this.timer = setInterval(() => {
      this.pollExpiredMatchups().catch((err) => {
        logger.error({ err }, 'Error in matchup finalizer polling cycle');
      });
    }, env.MATCHUP_SCHEDULER_INTERVAL_MS);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('Matchup Finalizer Scheduler stopped');
    }
  }

  public async pollExpiredMatchups(): Promise<number> {
    if (this.isRunning) {
      return 0; // Avoid overlapping cycles
    }

    this.isRunning = true;
    let finalizedCount = 0;

    try {
      const now = new Date();

      // Find all OPEN matchups whose voting window has closed
      const expiredMatchups = await prisma.matchup.findMany({
        where: {
          status: 'OPEN',
          votingClosesAt: {
            lte: now,
          },
        },
        select: { id: true },
        take: 20,
      });

      for (const m of expiredMatchups) {
        try {
          await matchupsService.finalizeMatchup(m.id);
          finalizedCount++;
          logger.info({ matchupId: m.id }, 'Background scheduler successfully finalized expired matchup');
        } catch (error: any) {
          logger.error({ matchupId: m.id, error: error.message }, 'Failed to finalize expired matchup');
        }
      }
    } catch (error: any) {
      // In test mode or when DB is not ready, gracefully handle
      logger.debug({ error: error.message }, 'Polling cycle encountered exception');
    } finally {
      this.isRunning = false;
    }

    return finalizedCount;
  }
}

export const matchupFinalizerScheduler = new MatchupFinalizerScheduler();

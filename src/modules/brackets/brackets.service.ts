import { prisma } from '../../config/database.js';
import { NotFoundError, ConflictError, BadRequestError } from '../../utils/errors.js';
import { generateBracketPlan, getNextRoundPosition } from '../../utils/bracket-calculator.js';
import { notificationService } from '../notifications/notification.service.js';
import { env } from '../../config/env.js';

export class BracketsService {
  public async generateBracket(tournamentId: string) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        contestants: {
          include: { contestant: true },
          orderBy: [{ seed: 'asc' }, { registeredAt: 'asc' }],
        },
        _count: {
          select: { matchups: true },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundError('Tournament not found');
    }

    if (tournament._count.matchups > 0) {
      throw new ConflictError('A bracket has already been generated for this tournament');
    }

    if (tournament.status !== 'REGISTRATION') {
      throw new ConflictError(`Cannot generate bracket for tournament with status '${tournament.status}'`);
    }

    const contestantIds = tournament.contestants.map((tc) => tc.contestantId);
    if (contestantIds.length < 2) {
      throw new BadRequestError('A tournament requires at least 2 contestants to generate a bracket');
    }

    const plan = generateBracketPlan(contestantIds);

    return prisma.$transaction(async (tx) => {
      // 1. Mark tournament as IN_PROGRESS
      await tx.tournament.update({
        where: { id: tournamentId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          currentRound: 1,
        },
      });

      // 2. Insert Round 1 matchups
      for (const m of plan.round1Matchups) {
        await tx.matchup.create({
          data: {
            tournamentId,
            roundNumber: m.roundNumber,
            position: m.position,
            contestantAId: m.contestantAId,
            contestantBId: m.contestantBId,
            winnerId: m.autoWinnerId,
            status: m.isBye ? 'BYE' : 'PENDING',
            completedAt: m.isBye ? new Date() : null,
          },
        });

        // If bye, notify contestant of automatic advancement to Round 2
        if (m.isBye && m.autoWinnerId) {
          const contestant = tournament.contestants.find((c) => c.contestantId === m.autoWinnerId)?.contestant;
          if (contestant) {
            await notificationService.queueNotification(
              {
                type: 'ROUND_ADVANCEMENT',
                recipientEmail: contestant.email,
                subject: `Automatic Bye Advancement: ${tournament.name}`,
                body: `Hello ${contestant.displayName},\n\nYou have received a bye in Round 1 of ${tournament.name} and automatically advance to Round 2!\n\nPrepare your roast line for the next round.`,
                metadata: { tournamentId, roundNumber: 1, contestantId: contestant.id },
              },
              tx
            );
          }
        }
      }

      // 3. Insert subsequent round matchups (Round 2 to Finals)
      for (const m of plan.subsequentRoundMatchups) {
        await tx.matchup.create({
          data: {
            tournamentId,
            roundNumber: m.roundNumber,
            position: m.position,
            contestantAId: m.contestantAId,
            contestantBId: m.contestantBId,
            winnerId: null,
            status: 'PENDING',
          },
        });
      }

      return {
        tournamentId,
        tournamentName: tournament.name,
        totalContestants: plan.totalContestants,
        powerOfTwo: plan.powerOfTwo,
        totalRounds: plan.totalRounds,
        totalByes: plan.totalByes,
        round1MatchupsCreated: plan.round1Matchups.length,
        subsequentMatchupsCreated: plan.subsequentRoundMatchups.length,
        advancements: plan.advancements,
      };
    });
  }

  public async getBracket(tournamentId: string) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        matchups: {
          orderBy: [{ roundNumber: 'asc' }, { position: 'asc' }],
          include: {
            contestantA: {
              select: { id: true, displayName: true, email: true },
            },
            contestantB: {
              select: { id: true, displayName: true, email: true },
            },
            winner: {
              select: { id: true, displayName: true },
            },
            roastLines: {
              select: {
                id: true,
                contestantId: true,
                roundNumber: true,
                content: true,
                submittedAt: true,
              },
            },
            votes: {
              select: {
                contestantId: true,
              },
            },
            tiebreakSessions: {
              orderBy: { sessionNumber: 'desc' },
              take: 1,
              include: {
                _count: { select: { votes: true } },
              },
            },
          },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundError('Tournament not found');
    }

    const now = Date.now();
    let currentDerivedRound = 1;

    // Group matchups by round
    const roundsMap: Record<number, any[]> = {};

    for (const m of tournament.matchups) {
      if (!roundsMap[m.roundNumber]) {
        roundsMap[m.roundNumber] = [];
      }

      let remainingSeconds = 0;
      if (m.status === 'OPEN' && m.votingClosesAt) {
        remainingSeconds = Math.max(0, Math.floor((m.votingClosesAt.getTime() - now) / 1000));
      }

      // Vote counts
      let votesCount: { contestantA: number; contestantB: number; total: number } | undefined;
      const isCompleted = m.status === 'COMPLETED' || m.status === 'CLOSED';
      if (isCompleted || env.ALLOW_LIVE_VOTE_COUNTS) {
        const countA = m.votes.filter((v) => v.contestantId === m.contestantAId).length;
        const countB = m.votes.filter((v) => v.contestantId === m.contestantBId).length;
        votesCount = {
          contestantA: countA,
          contestantB: countB,
          total: m.votes.length,
        };
      }

      const latestTiebreak = m.tiebreakSessions[0];
      const nextPos = getNextRoundPosition(m.roundNumber, m.position);

      roundsMap[m.roundNumber].push({
        id: m.id,
        roundNumber: m.roundNumber,
        position: m.position,
        status: m.status,
        isBye: m.status === 'BYE',
        contestantA: m.contestantA,
        contestantB: m.contestantB,
        winner: m.winner,
        roastLines: m.roastLines,
        votingOpensAt: m.votingOpensAt,
        votingClosesAt: m.votingClosesAt,
        remainingSeconds,
        votesCount,
        tiebreak: latestTiebreak
          ? {
              id: latestTiebreak.id,
              sessionNumber: latestTiebreak.sessionNumber,
              status: latestTiebreak.status,
              votingOpensAt: latestTiebreak.votingOpensAt,
              votingClosesAt: latestTiebreak.votingClosesAt,
              totalVotes: latestTiebreak._count.votes,
            }
          : null,
        nextProgression: {
          targetRoundNumber: nextPos.roundNumber,
          targetPosition: nextPos.position,
          targetSlot: nextPos.slot,
        },
      });

      // Derive active round: lowest round with incomplete/pending matches
      if (m.status !== 'COMPLETED' && m.status !== 'BYE') {
        if (currentDerivedRound === 1 || m.roundNumber < currentDerivedRound) {
          currentDerivedRound = m.roundNumber;
        }
      }
    }

    const rounds = Object.keys(roundsMap)
      .map(Number)
      .sort((a, b) => a - b)
      .map((roundNumber) => ({
        roundNumber,
        isCurrentRound: roundNumber === currentDerivedRound,
        matchups: roundsMap[roundNumber],
      }));

    return {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        currentRound: currentDerivedRound,
        votingDurationSeconds: tournament.votingDurationSeconds,
        startedAt: tournament.startedAt,
        completedAt: tournament.completedAt,
      },
      rounds,
    };
  }
}

export const bracketsService = new BracketsService();

import { prisma } from '../../config/database.js';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} from '../../utils/errors.js';
import {
  SubmitRoastLineInput,
  UpdateRoastLineInput,
  InitiateTiebreakInput,
} from './matchups.schema.js';
import { getNextRoundPosition } from '../../utils/bracket-calculator.js';
import { notificationService } from '../notifications/notification.service.js';
import { env } from '../../config/env.js';
import { Role, JwtPayload } from '../../types/index.js';

export class MatchupsService {
  /**
   * Submits a roast line for a matchup.
   * If both contestants have submitted their lines, the matchup is automatically opened for voting.
   */
  public async submitRoastLine(matchupId: string, input: SubmitRoastLineInput, user: JwtPayload) {
    const matchup = await prisma.matchup.findUnique({
      where: { id: matchupId },
      include: {
        tournament: true,
        roastLines: true,
      },
    });

    if (!matchup) {
      throw new NotFoundError('Matchup not found');
    }

    if (matchup.status !== 'PENDING') {
      throw new ConflictError(
        `Cannot submit roast line: matchup is currently '${matchup.status}'. Submissions are only accepted when PENDING.`
      );
    }

    // Determine the contestant ID submitting this line
    let targetContestantId: string | null = null;

    if (user.role === Role.ADMIN && input.contestantId) {
      targetContestantId = input.contestantId;
    } else if (user.contestantId) {
      targetContestantId = user.contestantId;
    } else {
      // Check if user has a linked contestant profile in DB
      const dbContestant = await prisma.contestant.findUnique({
        where: { userId: user.userId },
      });
      if (dbContestant) {
        targetContestantId = dbContestant.id;
      }
    }

    if (!targetContestantId) {
      throw new ForbiddenError('You must be a registered contestant or an admin to submit a roast line');
    }

    // Verify contestant is actually participating in this matchup
    const isParticipant =
      matchup.contestantAId === targetContestantId || matchup.contestantBId === targetContestantId;

    if (!isParticipant) {
      throw new ForbiddenError('Contestant is not participating in this matchup');
    }

    // Check if contestant already submitted a line for this matchup
    const existingSubmission = matchup.roastLines.find((r) => r.contestantId === targetContestantId);
    if (existingSubmission) {
      throw new ConflictError(
        'Roast line already submitted for this matchup. Use PATCH to update before voting opens.'
      );
    }

    return prisma.$transaction(async (tx) => {
      const roastLine = await tx.roastLine.create({
        data: {
          matchupId,
          contestantId: targetContestantId!,
          roundNumber: matchup.roundNumber,
          content: input.content,
        },
        include: {
          contestant: {
            select: { id: true, displayName: true, email: true },
          },
        },
      });

      // Check if both contestants have now submitted lines
      const allLines = await tx.roastLine.findMany({
        where: { matchupId },
      });

      const hasA = allLines.some((l) => l.contestantId === matchup.contestantAId);
      const hasB = allLines.some((l) => l.contestantId === matchup.contestantBId);

      // If both lines are submitted and both contestants are present, automatically open the voting window
      if (hasA && hasB && matchup.contestantAId && matchup.contestantBId) {
        const opensAt = new Date();
        const closesAt = new Date(opensAt.getTime() + matchup.tournament.votingDurationSeconds * 1000);

        await tx.matchup.update({
          where: { id: matchupId },
          data: {
            status: 'OPEN',
            votingOpensAt: opensAt,
            votingClosesAt: closesAt,
          },
        });
      }

      return roastLine;
    });
  }

  public async getRoastLines(matchupId: string) {
    const matchup = await prisma.matchup.findUnique({
      where: { id: matchupId },
    });

    if (!matchup) {
      throw new NotFoundError('Matchup not found');
    }

    return prisma.roastLine.findMany({
      where: { matchupId },
      include: {
        contestant: {
          select: { id: true, displayName: true },
        },
      },
      orderBy: { submittedAt: 'asc' },
    });
  }

  public async updateRoastLine(id: string, input: UpdateRoastLineInput, user: JwtPayload) {
    const roastLine = await prisma.roastLine.findUnique({
      where: { id },
      include: {
        matchup: true,
        contestant: true,
      },
    });

    if (!roastLine) {
      throw new NotFoundError('Roast line not found');
    }

    // Edits are locked once voting is open or closed
    if (roastLine.matchup.status !== 'PENDING') {
      throw new ConflictError(
        'Roast line cannot be edited once voting is open, closed, or completed'
      );
    }

    // Role / ownership verification
    const isOwner = roastLine.contestant.userId === user.userId || roastLine.contestantId === user.contestantId;
    if (user.role !== Role.ADMIN && !isOwner) {
      throw new ForbiddenError('You can only edit your own roast line');
    }

    return prisma.roastLine.update({
      where: { id },
      data: {
        content: input.content,
      },
    });
  }

  public async deleteRoastLine(id: string, user: JwtPayload) {
    const roastLine = await prisma.roastLine.findUnique({
      where: { id },
      include: {
        matchup: true,
        contestant: true,
      },
    });

    if (!roastLine) {
      throw new NotFoundError('Roast line not found');
    }

    if (roastLine.matchup.status !== 'PENDING') {
      throw new ConflictError(
        'Roast line cannot be deleted once voting is open, closed, or completed'
      );
    }

    const isOwner = roastLine.contestant.userId === user.userId || roastLine.contestantId === user.contestantId;
    if (user.role !== Role.ADMIN && !isOwner) {
      throw new ForbiddenError('You can only delete your own roast line');
    }

    await prisma.roastLine.delete({
      where: { id },
    });

    return { id, deleted: true };
  }

  /**
   * Retrieves matchup status and remaining time.
   * Proactively triggers finalization if the deadline has elapsed.
   */
  public async getMatchupStatus(id: string) {
    let matchup = await prisma.matchup.findUnique({
      where: { id },
      include: {
        contestantA: { select: { id: true, displayName: true } },
        contestantB: { select: { id: true, displayName: true } },
        winner: { select: { id: true, displayName: true } },
        tiebreakSessions: {
          orderBy: { sessionNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!matchup) {
      throw new NotFoundError('Matchup not found');
    }

    const now = new Date();

    // Check if open matchup voting window has elapsed; if so, trigger finalization immediately!
    if (matchup.status === 'OPEN' && matchup.votingClosesAt && now >= matchup.votingClosesAt) {
      await this.finalizeMatchup(id);
      matchup = (await prisma.matchup.findUnique({
        where: { id },
        include: {
          contestantA: { select: { id: true, displayName: true } },
          contestantB: { select: { id: true, displayName: true } },
          winner: { select: { id: true, displayName: true } },
          tiebreakSessions: {
            orderBy: { sessionNumber: 'desc' },
            take: 1,
          },
        },
      }))!;
    }

    let remainingSeconds = 0;
    if (matchup.status === 'OPEN' && matchup.votingClosesAt) {
      remainingSeconds = Math.max(0, Math.floor((matchup.votingClosesAt.getTime() - Date.now()) / 1000));
    }

    const latestTiebreak = matchup.tiebreakSessions[0];

    return {
      matchupId: matchup.id,
      tournamentId: matchup.tournamentId,
      roundNumber: matchup.roundNumber,
      position: matchup.position,
      status: matchup.status,
      contestantA: matchup.contestantA,
      contestantB: matchup.contestantB,
      winner: matchup.winner,
      votingOpensAt: matchup.votingOpensAt,
      votingClosesAt: matchup.votingClosesAt,
      remainingSeconds,
      serverTime: new Date().toISOString(),
      tiebreakActive: latestTiebreak ? latestTiebreak.status === 'OPEN' : false,
      tiebreakSession: latestTiebreak || null,
    };
  }

  /**
   * Retrieves matchup voting results, total votes, percentages, provisional vs final status.
   */
  public async getMatchupResults(id: string) {
    let matchup = await prisma.matchup.findUnique({
      where: { id },
      include: {
        contestantA: { select: { id: true, displayName: true, email: true } },
        contestantB: { select: { id: true, displayName: true, email: true } },
        winner: { select: { id: true, displayName: true } },
        votes: true,
        tiebreakSessions: {
          orderBy: { sessionNumber: 'desc' },
          take: 1,
          include: {
            votes: true,
          },
        },
      },
    });

    if (!matchup) {
      throw new NotFoundError('Matchup not found');
    }

    const now = new Date();

    // Check if open matchup voting window has elapsed; if so, trigger finalization immediately!
    if (matchup.status === 'OPEN' && matchup.votingClosesAt && now >= matchup.votingClosesAt) {
      await this.finalizeMatchup(id);
      matchup = (await prisma.matchup.findUnique({
        where: { id },
        include: {
          contestantA: { select: { id: true, displayName: true, email: true } },
          contestantB: { select: { id: true, displayName: true, email: true } },
          winner: { select: { id: true, displayName: true } },
          votes: true,
          tiebreakSessions: {
            orderBy: { sessionNumber: 'desc' },
            take: 1,
            include: {
              votes: true,
            },
          },
        },
      }))!;
    }

    const isFinalized = matchup.status === 'COMPLETED' || matchup.status === 'BYE';
    const isProvisional = !isFinalized;

    // Check if live counts are hidden during active voting
    const shouldHideVotes = !isFinalized && !env.ALLOW_LIVE_VOTE_COUNTS;

    const votesA = matchup.votes.filter((v) => v.contestantId === matchup.contestantAId).length;
    const votesB = matchup.votes.filter((v) => v.contestantId === matchup.contestantBId).length;
    const totalVotes = matchup.votes.length;

    const percentageA = totalVotes > 0 ? Number(((votesA / totalVotes) * 100).toFixed(1)) : 0;
    const percentageB = totalVotes > 0 ? Number(((votesB / totalVotes) * 100).toFixed(1)) : 0;

    const latestTiebreak = matchup.tiebreakSessions[0];
    let tiebreakResults = null;

    if (latestTiebreak) {
      const tbVotesA = latestTiebreak.votes.filter((v) => v.contestantId === matchup.contestantAId).length;
      const tbVotesB = latestTiebreak.votes.filter((v) => v.contestantId === matchup.contestantBId).length;
      const tbTotal = latestTiebreak.votes.length;

      tiebreakResults = {
        sessionId: latestTiebreak.id,
        sessionNumber: latestTiebreak.sessionNumber,
        status: latestTiebreak.status,
        votingOpensAt: latestTiebreak.votingOpensAt,
        votingClosesAt: latestTiebreak.votingClosesAt,
        votesContestantA: tbVotesA,
        votesContestantB: tbVotesB,
        totalVotes: tbTotal,
      };
    }

    return {
      matchupId: matchup.id,
      tournamentId: matchup.tournamentId,
      roundNumber: matchup.roundNumber,
      status: matchup.status,
      isProvisional,
      isFinalized,
      contestantA: matchup.contestantA,
      contestantB: matchup.contestantB,
      winner: matchup.winner,
      completedAt: matchup.completedAt,
      results: shouldHideVotes
        ? {
            hidden: true,
            message: 'Detailed vote counts are hidden while voting window is open to prevent bias',
          }
        : {
            hidden: false,
            contestantAVotes: votesA,
            contestantBVotes: votesB,
            totalVotes,
            contestantAPercentage: percentageA,
            contestantBPercentage: percentageB,
          },
      tiebreak: tiebreakResults,
    };
  }

  /**
   * Finalizes an expired matchup atomically with row-level locking.
   * If tied: creates a sudden-death tiebreak session.
   * If decided: marks completed, advances winner to next round, and triggers notifications.
   */
  public async finalizeMatchup(matchupId: string) {
    return prisma.$transaction(
      async (tx) => {
        // Query matchup with raw SQL or standard query
        const matchup = await tx.matchup.findUnique({
          where: { id: matchupId },
          include: {
            tournament: true,
            votes: true,
            contestantA: true,
            contestantB: true,
            tiebreakSessions: {
              orderBy: { sessionNumber: 'desc' },
              take: 1,
              include: { votes: true },
            },
          },
        });

        if (!matchup) {
          throw new NotFoundError('Matchup not found');
        }

        // Idempotency: if already completed or BYE, do nothing
        if (matchup.status === 'COMPLETED' || matchup.status === 'BYE') {
          return { matchupId, status: matchup.status, winnerId: matchup.winnerId, alreadyFinalized: true };
        }

        const now = new Date();

        // Check if there is an active tiebreak session
        const activeTiebreak = matchup.tiebreakSessions[0];
        if (activeTiebreak && activeTiebreak.status === 'OPEN') {
          if (now < activeTiebreak.votingClosesAt) {
            return {
              matchupId,
              status: 'TIEBREAK_OPEN',
              message: 'Tiebreak voting window is still open',
              tiebreakSessionId: activeTiebreak.id,
            };
          }

          // Finalize tiebreak session
          const tbVotesA = activeTiebreak.votes.filter((v) => v.contestantId === matchup.contestantAId).length;
          const tbVotesB = activeTiebreak.votes.filter((v) => v.contestantId === matchup.contestantBId).length;

          if (tbVotesA === tbVotesB) {
            // Still tied in tiebreak! Launch next sudden-death tiebreak session
            const nextSessionNumber = activeTiebreak.sessionNumber + 1;
            const opensAt = new Date();
            const closesAt = new Date(opensAt.getTime() + matchup.tournament.votingDurationSeconds * 1000);

            await tx.tiebreakSession.update({
              where: { id: activeTiebreak.id },
              data: { status: 'COMPLETED', completedAt: now },
            });

            const newSession = await tx.tiebreakSession.create({
              data: {
                matchupId,
                sessionNumber: nextSessionNumber,
                status: 'OPEN',
                votingOpensAt: opensAt,
                votingClosesAt: closesAt,
              },
            });

            return {
              matchupId,
              status: 'TIED_AGAIN',
              message: `Tiebreak session ${activeTiebreak.sessionNumber} was tied (${tbVotesA}-${tbVotesB}). Initiated sudden-death session ${nextSessionNumber}.`,
              tiebreakSessionId: newSession.id,
            };
          }

          const winnerId = tbVotesA > tbVotesB ? matchup.contestantAId! : matchup.contestantBId!;

          await tx.tiebreakSession.update({
            where: { id: activeTiebreak.id },
            data: { status: 'COMPLETED', winnerId, completedAt: now },
          });

          return this.completeMatchupAdvancement(tx, matchup, winnerId);
        }

        // Standard round deadline check
        if (!matchup.votingClosesAt || now < matchup.votingClosesAt) {
          return {
            matchupId,
            status: matchup.status,
            message: 'Voting window has not closed yet',
          };
        }

        // Count standard votes
        const votesA = matchup.votes.filter((v) => v.contestantId === matchup.contestantAId).length;
        const votesB = matchup.votes.filter((v) => v.contestantId === matchup.contestantBId).length;

        // Check for TIE
        if (votesA === votesB) {
          // Initialize sudden-death revote tiebreak session
          const opensAt = new Date();
          const closesAt = new Date(opensAt.getTime() + matchup.tournament.votingDurationSeconds * 1000);

          const tiebreakSession = await tx.tiebreakSession.create({
            data: {
              matchupId,
              sessionNumber: 1,
              status: 'OPEN',
              votingOpensAt: opensAt,
              votingClosesAt: closesAt,
            },
          });

          return {
            matchupId,
            status: 'TIED',
            message: `Matchup tied (${votesA}-${votesB}). Sudden-death tiebreak session initiated.`,
            tiebreakSessionId: tiebreakSession.id,
            votingClosesAt: closesAt,
          };
        }

        const winnerId = votesA > votesB ? matchup.contestantAId! : matchup.contestantBId!;
        return this.completeMatchupAdvancement(tx, matchup, winnerId);
      },
      {
        timeout: 15000,
      }
    );
  }

  /**
   * Helper that marks a matchup completed, advances the winner into the next round,
   * checks for tournament completion, and enqueues outbox notifications.
   */
  private async completeMatchupAdvancement(
    tx: any,
    matchup: any,
    winnerId: string
  ) {
    const now = new Date();

    // 1. Mark current matchup COMPLETED
    await tx.matchup.update({
      where: { id: matchup.id },
      data: {
        winnerId,
        status: 'COMPLETED',
        completedAt: now,
      },
    });

    const nextPos = getNextRoundPosition(matchup.roundNumber, matchup.position);

    // 2. Find target matchup in next round
    const nextMatchup = await tx.matchup.findUnique({
      where: {
        tournamentId_roundNumber_position: {
          tournamentId: matchup.tournamentId,
          roundNumber: nextPos.roundNumber,
          position: nextPos.position,
        },
      },
      include: {
        roastLines: true,
      },
    });

    const winningContestant =
      matchup.contestantAId === winnerId ? matchup.contestantA : matchup.contestantB;

    let isTournamentChampion = false;

    if (nextMatchup) {
      // Update target matchup slot with winner
      const updateData: any = {};
      if (nextPos.slot === 'A') {
        updateData.contestantAId = winnerId;
      } else {
        updateData.contestantBId = winnerId;
      }

      await tx.matchup.update({
        where: { id: nextMatchup.id },
        data: updateData,
      });

      // Update tournament currentRound if applicable
      await tx.tournament.update({
        where: { id: matchup.tournamentId },
        data: {
          currentRound: Math.max(matchup.tournament.currentRound, nextPos.roundNumber),
        },
      });

      // Enqueue advancement notification
      if (winningContestant) {
        await notificationService.queueNotification(
          {
            type: 'ROUND_ADVANCEMENT',
            recipientEmail: winningContestant.email,
            subject: `Victory in Round ${matchup.roundNumber}! - ${matchup.tournament.name}`,
            body: `Congratulations ${winningContestant.displayName}!\n\nYou won Matchup ${matchup.position} in Round ${matchup.roundNumber} and have advanced to Round ${nextPos.roundNumber}, Matchup ${nextPos.position}!\n\nPlease log in to submit your new roast line for Round ${nextPos.roundNumber}.`,
            metadata: {
              tournamentId: matchup.tournamentId,
              roundNumber: nextPos.roundNumber,
              position: nextPos.position,
              winnerId,
            },
          },
          tx
        );
      }
    } else {
      // If there is no next round matchup, this was the FINALS! Tournament is completed!
      isTournamentChampion = true;

      await tx.tournament.update({
        where: { id: matchup.tournamentId },
        data: {
          status: 'COMPLETED',
          completedAt: now,
        },
      });

      if (winningContestant) {
        await notificationService.queueNotification(
          {
            type: 'TOURNAMENT_CHAMPION',
            recipientEmail: winningContestant.email,
            subject: `🏆 TOURNAMENT CHAMPION: ${matchup.tournament.name}`,
            body: `All hail the Roastmaster! 👑\n\nCongratulations ${winningContestant.displayName}, you have defeated all opponents and emerged as the undisputed CHAMPION of ${matchup.tournament.name}!`,
            metadata: {
              tournamentId: matchup.tournamentId,
              winnerId,
              completedAt: now.toISOString(),
            },
          },
          tx
        );
      }
    }

    return {
      matchupId: matchup.id,
      status: 'COMPLETED',
      winnerId,
      isTournamentChampion,
      advancedTo: nextMatchup
        ? {
            roundNumber: nextPos.roundNumber,
            position: nextPos.position,
            slot: nextPos.slot,
          }
        : null,
    };
  }

  /**
   * Initiates or manages a sudden-death tiebreak manually or administratively.
   */
  public async initiateTiebreak(matchupId: string, input: InitiateTiebreakInput, user: JwtPayload) {
    const matchup = await prisma.matchup.findUnique({
      where: { id: matchupId },
      include: {
        tournament: true,
        votes: true,
        tiebreakSessions: {
          orderBy: { sessionNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!matchup) {
      throw new NotFoundError('Matchup not found');
    }

    if (matchup.status === 'COMPLETED' || matchup.status === 'BYE') {
      throw new ConflictError('Cannot initiate tiebreak: matchup is already completed or a bye');
    }

    const votesA = matchup.votes.filter((v) => v.contestantId === matchup.contestantAId).length;
    const votesB = matchup.votes.filter((v) => v.contestantId === matchup.contestantBId).length;
    const isTied = votesA === votesB;

    if (!isTied && !input.force) {
      throw new ConflictError(
        `Cannot initiate tiebreak: matchup is not tied (Contestant A: ${votesA}, Contestant B: ${votesB}). Admins may force with force=true.`
      );
    }

    if (input.force && user.role !== Role.ADMIN) {
      throw new ForbiddenError('Only administrators can force a tiebreak on an untied matchup');
    }

    const duration = input.durationSeconds ?? matchup.tournament.votingDurationSeconds;
    const opensAt = new Date();
    const closesAt = new Date(opensAt.getTime() + duration * 1000);

    const latestSession = matchup.tiebreakSessions[0];
    const sessionNumber = latestSession ? latestSession.sessionNumber + 1 : 1;

    return prisma.$transaction(async (tx) => {
      if (latestSession && latestSession.status === 'OPEN') {
        await tx.tiebreakSession.update({
          where: { id: latestSession.id },
          data: { status: 'COMPLETED', completedAt: opensAt },
        });
      }

      const tiebreakSession = await tx.tiebreakSession.create({
        data: {
          matchupId,
          sessionNumber,
          status: 'OPEN',
          votingOpensAt: opensAt,
          votingClosesAt: closesAt,
        },
      });

      await tx.matchup.update({
        where: { id: matchupId },
        data: {
          status: 'OPEN',
          votingOpensAt: opensAt,
          votingClosesAt: closesAt,
        },
      });

      return {
        matchupId,
        tiebreakSessionId: tiebreakSession.id,
        sessionNumber,
        status: 'OPEN',
        votingOpensAt: opensAt,
        votingClosesAt: closesAt,
      };
    });
  }
}

export const matchupsService = new MatchupsService();

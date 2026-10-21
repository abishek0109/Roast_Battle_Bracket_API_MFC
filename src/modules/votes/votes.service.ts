import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
  VotingClosedError,
} from '../../utils/errors.js';
import { SubmitVoteInput } from './votes.schema.js';
import { JwtPayload } from '../../types/index.js';

export class VotesService {
  /**
   * Submits a vote for a matchup.
   * Enforces server-side deadline checks, participant validation, self-voting prevention,
   * tiebreak routing, and database-level unique constraints to guarantee concurrency safety.
   */
  public async submitVote(matchupId: string, input: SubmitVoteInput, user: JwtPayload) {
    const voterId = user.userId;
    const targetContestantId = input.contestantId;

    return prisma.$transaction(
      async (tx) => {
        // Fetch matchup with active tiebreak session
        const matchup = await tx.matchup.findUnique({
          where: { id: matchupId },
          include: {
            tiebreakSessions: {
              where: { status: 'OPEN' },
              orderBy: { sessionNumber: 'desc' },
              take: 1,
            },
          },
        });

        if (!matchup) {
          throw new NotFoundError('Matchup not found');
        }

        if (matchup.status !== 'OPEN') {
          throw new ConflictError(
            `Matchup is not open for voting. Current status is '${matchup.status}'`
          );
        }

        const now = new Date();
        const activeTiebreak = matchup.tiebreakSessions[0];

        // 1. Enforce Server-Side Deadline
        if (activeTiebreak) {
          if (now < activeTiebreak.votingOpensAt) {
            throw new ConflictError('Tiebreak voting window has not opened yet');
          }
          if (now >= activeTiebreak.votingClosesAt) {
            throw new VotingClosedError('Tiebreak voting window has closed');
          }
        } else {
          if (!matchup.votingOpensAt || now < matchup.votingOpensAt) {
            throw new ConflictError('Voting window has not opened yet');
          }
          if (!matchup.votingClosesAt || now >= matchup.votingClosesAt) {
            throw new VotingClosedError('Voting window has closed');
          }
        }

        // 2. Validate contestant is participating in this matchup
        const isParticipant =
          matchup.contestantAId === targetContestantId || matchup.contestantBId === targetContestantId;

        if (!isParticipant) {
          throw new BadRequestError('The selected contestant is not participating in this matchup');
        }

        // 3. Prevent Self-Voting
        const contestant = await tx.contestant.findUnique({
          where: { id: targetContestantId },
        });

        if (!contestant) {
          throw new NotFoundError('Contestant not found');
        }

        const isSelfVote =
          contestant.userId === voterId ||
          (user.contestantId && user.contestantId === targetContestantId) ||
          contestant.email === user.email;

        if (isSelfVote) {
          throw new ForbiddenError('Contestants are strictly prohibited from voting for themselves');
        }

        // 4. Record Vote (Routing to TiebreakVote or standard Vote)
        if (activeTiebreak) {
          // Check for existing tiebreak vote
          const existingTiebreakVote = await tx.tiebreakVote.findUnique({
            where: {
              tiebreakSessionId_voterId: {
                tiebreakSessionId: activeTiebreak.id,
                voterId,
              },
            },
          });

          if (existingTiebreakVote) {
            throw new ConflictError('You have already voted in this tiebreak session');
          }

          try {
            const recordedVote = await tx.tiebreakVote.create({
              data: {
                tiebreakSessionId: activeTiebreak.id,
                voterId,
                contestantId: targetContestantId,
              },
            });

            return {
              voteId: recordedVote.id,
              matchupId,
              tiebreakSessionId: activeTiebreak.id,
              voterId,
              contestantId: targetContestantId,
              isTiebreak: true,
              createdAt: recordedVote.createdAt,
            };
          } catch (error: any) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
              throw new ConflictError('You have already voted in this tiebreak session');
            }
            throw error;
          }
        } else {
          // Check for existing standard vote
          const existingVote = await tx.vote.findUnique({
            where: {
              matchupId_voterId: {
                matchupId,
                voterId,
              },
            },
          });

          if (existingVote) {
            throw new ConflictError('You have already voted in this matchup');
          }

          try {
            const recordedVote = await tx.vote.create({
              data: {
                matchupId,
                voterId,
                contestantId: targetContestantId,
              },
            });

            return {
              voteId: recordedVote.id,
              matchupId,
              voterId,
              contestantId: targetContestantId,
              isTiebreak: false,
              createdAt: recordedVote.createdAt,
            };
          } catch (error: any) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
              throw new ConflictError('You have already voted in this matchup');
            }
            throw error;
          }
        }
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 10000,
      }
    );
  }
}

export const votesService = new VotesService();

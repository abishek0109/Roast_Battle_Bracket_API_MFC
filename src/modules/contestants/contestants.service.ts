import { prisma } from '../../config/database.js';
import { ConflictError, NotFoundError, ForbiddenError } from '../../utils/errors.js';
import { CreateContestantInput, UpdateContestantInput } from './contestants.schema.js';
import { Role } from '../../types/index.js';

export class ContestantsService {
  public async createContestant(input: CreateContestantInput, requestingUserId?: string, userRole?: Role) {
    const existing = await prisma.contestant.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new ConflictError('A contestant with this email already exists');
    }

    let linkedUserId = input.userId;
    if (!linkedUserId && userRole === Role.CONTESTANT && requestingUserId) {
      linkedUserId = requestingUserId;
    }

    if (linkedUserId) {
      const existingUserLink = await prisma.contestant.findUnique({
        where: { userId: linkedUserId },
      });
      if (existingUserLink) {
        throw new ConflictError('This user account is already linked to a contestant profile');
      }
    }

    return prisma.$transaction(async (tx) => {
      const contestant = await tx.contestant.create({
        data: {
          displayName: input.displayName,
          email: input.email,
          userId: linkedUserId || null,
        },
      });

      if (input.tournamentId) {
        const tournament = await tx.tournament.findUnique({
          where: { id: input.tournamentId },
        });

        if (!tournament) {
          throw new NotFoundError('Specified tournament not found');
        }

        if (tournament.status !== 'REGISTRATION') {
          throw new ConflictError('Cannot register contestants to a tournament that has already started or completed');
        }

        await tx.tournamentContestant.create({
          data: {
            tournamentId: input.tournamentId,
            contestantId: contestant.id,
          },
        });
      }

      return contestant;
    });
  }

  public async getContestants(query: { page: number; limit: number; search?: string; tournamentId?: string }) {
    const { page, limit, search, tournamentId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (tournamentId) {
      where.tournaments = {
        some: { tournamentId },
      };
    }

    const [total, contestants] = await Promise.all([
      prisma.contestant.count({ where }),
      prisma.contestant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tournaments: {
            include: {
              tournament: {
                select: { id: true, name: true, status: true },
              },
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: contestants,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  public async getContestantById(id: string) {
    const contestant = await prisma.contestant.findUnique({
      where: { id },
      include: {
        tournaments: {
          include: {
            tournament: true,
          },
        },
        _count: {
          select: {
            matchupsWon: true,
            roastLines: true,
            votesReceived: true,
          },
        },
      },
    });

    if (!contestant) {
      throw new NotFoundError('Contestant not found');
    }

    return contestant;
  }

  public async updateContestant(
    id: string,
    input: UpdateContestantInput,
    requestingUserId?: string,
    userRole?: Role
  ) {
    const contestant = await prisma.contestant.findUnique({
      where: { id },
    });

    if (!contestant) {
      throw new NotFoundError('Contestant not found');
    }

    // Role verification: only Admin or owner can update
    if (userRole !== Role.ADMIN && contestant.userId !== requestingUserId) {
      throw new ForbiddenError('You can only update your own contestant profile');
    }

    if (input.email && input.email !== contestant.email) {
      const emailConflict = await prisma.contestant.findUnique({
        where: { email: input.email },
      });
      if (emailConflict) {
        throw new ConflictError('A contestant with this email already exists');
      }
    }

    return prisma.contestant.update({
      where: { id },
      data: {
        ...(input.displayName ? { displayName: input.displayName } : {}),
        ...(input.email ? { email: input.email } : {}),
      },
    });
  }

  public async deleteContestant(id: string, requestingUserId?: string, userRole?: Role) {
    const contestant = await prisma.contestant.findUnique({
      where: { id },
      include: {
        tournaments: {
          include: {
            tournament: {
              include: {
                _count: {
                  select: { matchups: true },
                },
              },
            },
          },
        },
        matchupsAsA: true,
        matchupsAsB: true,
      },
    });

    if (!contestant) {
      throw new NotFoundError('Contestant not found');
    }

    // Role verification
    if (userRole !== Role.ADMIN && contestant.userId !== requestingUserId) {
      throw new ForbiddenError('You are not authorized to delete this contestant profile');
    }

    // Rule: Allow deletion only BEFORE the tournament bracket is generated.
    // If contestant is part of generated matchups, or their registered tournament has matchups generated, reject with 409 Conflict!
    const hasGeneratedMatchups =
      contestant.matchupsAsA.length > 0 ||
      contestant.matchupsAsB.length > 0 ||
      contestant.tournaments.some((tc) => tc.tournament._count.matchups > 0);

    if (hasGeneratedMatchups) {
      throw new ConflictError(
        'Cannot delete contestant: bracket generation has already started or matchups have been generated for this contestant'
      );
    }

    await prisma.contestant.delete({
      where: { id },
    });

    return { id, deleted: true };
  }

  public async getContestantHistory(id: string) {
    const contestant = await prisma.contestant.findUnique({
      where: { id },
      include: {
        tournaments: {
          include: {
            tournament: true,
          },
        },
      },
    });

    if (!contestant) {
      throw new NotFoundError('Contestant not found');
    }

    // Find all matchups where contestant was A or B
    const matchups = await prisma.matchup.findMany({
      where: {
        OR: [{ contestantAId: id }, { contestantBId: id }],
      },
      include: {
        tournament: {
          select: { id: true, name: true, status: true },
        },
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
          where: { contestantId: id },
        },
        votes: {
          where: { contestantId: id },
        },
        _count: {
          select: { votes: true },
        },
      },
      orderBy: [{ tournamentId: 'asc' }, { roundNumber: 'asc' }],
    });

    const formattedHistory = matchups.map((m) => {
      const isContestantA = m.contestantAId === id;
      const opponent = isContestantA ? m.contestantB : m.contestantA;
      const isBye = m.status === 'BYE';
      const isWinner = m.winnerId === id;
      const myVotes = m.votes.length;
      const totalMatchupVotes = m._count.votes;
      const votePercentage =
        totalMatchupVotes > 0 ? Number(((myVotes / totalMatchupVotes) * 100).toFixed(1)) : 0;

      return {
        matchupId: m.id,
        tournamentId: m.tournament.id,
        tournamentName: m.tournament.name,
        roundNumber: m.roundNumber,
        status: m.status,
        isBye,
        opponent: opponent ? { id: opponent.id, displayName: opponent.displayName } : null,
        myRoastLine: m.roastLines[0]?.content || null,
        myVotes,
        totalMatchupVotes,
        votePercentage,
        isWinner,
        completedAt: m.completedAt,
      };
    });

    return {
      contestant: {
        id: contestant.id,
        displayName: contestant.displayName,
        email: contestant.email,
        createdAt: contestant.createdAt,
      },
      totalMatchupsPlayed: matchups.length,
      matchupsWon: matchups.filter((m) => m.winnerId === id).length,
      tournamentsParticipated: contestant.tournaments.map((t) => ({
        id: t.tournament.id,
        name: t.tournament.name,
        status: t.tournament.status,
      })),
      history: formattedHistory,
    };
  }
}

export const contestantsService = new ContestantsService();

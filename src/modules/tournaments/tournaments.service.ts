import { prisma } from '../../config/database.js';
import { NotFoundError, ConflictError, BadRequestError } from '../../utils/errors.js';
import { CreateTournamentInput, UpdateTournamentInput, EnrollContestantInput } from './tournaments.schema.js';
import { TournamentStatus } from '../../types/index.js';

export class TournamentsService {
  public async createTournament(input: CreateTournamentInput) {
    return prisma.tournament.create({
      data: {
        name: input.name,
        votingDurationSeconds: input.votingDurationSeconds ?? 300,
        status: 'REGISTRATION',
        currentRound: 1,
      },
    });
  }

  public async getTournaments(query: { page: number; limit: number; status?: TournamentStatus }) {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [total, tournaments] = await Promise.all([
      prisma.tournament.count({ where }),
      prisma.tournament.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              contestants: true,
              matchups: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: tournaments,
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

  public async getTournamentById(id: string) {
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        contestants: {
          include: {
            contestant: {
              select: {
                id: true,
                displayName: true,
                email: true,
                createdAt: true,
              },
            },
          },
          orderBy: { registeredAt: 'asc' },
        },
        _count: {
          select: {
            matchups: true,
          },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundError('Tournament not found');
    }

    return tournament;
  }

  public async updateTournament(id: string, input: UpdateTournamentInput) {
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        _count: {
          select: { matchups: true },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundError('Tournament not found');
    }

    // If bracket has already been generated, restrict settings modifications
    if (tournament._count.matchups > 0) {
      if (input.votingDurationSeconds && input.votingDurationSeconds !== tournament.votingDurationSeconds) {
        throw new ConflictError(
          'Cannot modify voting duration after tournament bracket has already been generated'
        );
      }
    }

    // Validate status transition
    if (input.status && input.status !== tournament.status) {
      const allowedTransitions: Record<TournamentStatus, TournamentStatus[]> = {
        REGISTRATION: ['IN_PROGRESS'],
        IN_PROGRESS: ['COMPLETED'],
        COMPLETED: [],
      };

      if (!allowedTransitions[tournament.status].includes(input.status)) {
        throw new BadRequestError(
          `Cannot transition tournament status from '${tournament.status}' to '${input.status}'`
        );
      }
    }

    return prisma.tournament.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.votingDurationSeconds ? { votingDurationSeconds: input.votingDurationSeconds } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
    });
  }

  public async enrollContestant(tournamentId: string, input: EnrollContestantInput) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        _count: {
          select: { matchups: true },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundError('Tournament not found');
    }

    if (tournament.status !== 'REGISTRATION' || tournament._count.matchups > 0) {
      throw new ConflictError('Cannot enroll contestants: tournament registration is closed or bracket already generated');
    }

    const contestant = await prisma.contestant.findUnique({
      where: { id: input.contestantId },
    });

    if (!contestant) {
      throw new NotFoundError('Contestant not found');
    }

    const existingEnrollment = await prisma.tournamentContestant.findUnique({
      where: {
        tournamentId_contestantId: {
          tournamentId,
          contestantId: input.contestantId,
        },
      },
    });

    if (existingEnrollment) {
      throw new ConflictError('Contestant is already enrolled in this tournament');
    }

    return prisma.tournamentContestant.create({
      data: {
        tournamentId,
        contestantId: input.contestantId,
        seed: input.seed ?? null,
      },
      include: {
        contestant: true,
      },
    });
  }

  public async getTournamentWinner(tournamentId: string) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundError('Tournament not found');
    }

    if (tournament.status !== 'COMPLETED') {
      return {
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        status: tournament.status,
        currentRound: tournament.currentRound,
        isCompleted: false,
        champion: null,
        message: 'Tournament is currently in progress or registration; no finalized champion yet.',
      };
    }

    // The final round has roundNumber = max round, position = 1
    const finalMatchup = await prisma.matchup.findFirst({
      where: {
        tournamentId,
        status: 'COMPLETED',
      },
      orderBy: {
        roundNumber: 'desc',
      },
      include: {
        winner: true,
      },
    });

    if (!finalMatchup || !finalMatchup.winner) {
      return {
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        status: tournament.status,
        isCompleted: true,
        champion: null,
        message: 'Tournament is marked completed but final matchup record has no winner recorded.',
      };
    }

    return {
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      status: tournament.status,
      isCompleted: true,
      completedAt: tournament.completedAt,
      champion: {
        id: finalMatchup.winner.id,
        displayName: finalMatchup.winner.displayName,
        email: finalMatchup.winner.email,
      },
      finalMatchupId: finalMatchup.id,
    };
  }
}

export const tournamentsService = new TournamentsService();

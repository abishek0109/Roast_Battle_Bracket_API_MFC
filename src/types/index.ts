import { Role, TournamentStatus, MatchupStatus, TiebreakStatus, NotificationStatus } from '@prisma/client';

export { Role, TournamentStatus, MatchupStatus, TiebreakStatus, NotificationStatus };

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
  contestantId?: string | null;
}

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface MatchupBracketNode {
  id: string;
  roundNumber: number;
  position: number;
  status: MatchupStatus;
  contestantA: {
    id: string;
    displayName: string;
    email: string;
  } | null;
  contestantB: {
    id: string;
    displayName: string;
    email: string;
  } | null;
  winner: {
    id: string;
    displayName: string;
  } | null;
  isBye: boolean;
  roastLines: Array<{
    id: string;
    contestantId: string;
    content: string;
    submittedAt: Date;
  }>;
  votingOpensAt: Date | null;
  votingClosesAt: Date | null;
  remainingSeconds: number;
  votesCount?: {
    contestantA: number;
    contestantB: number;
    total: number;
  };
  tiebreakActive: boolean;
  nextMatchupPosition?: {
    roundNumber: number;
    position: number;
    slot: 'A' | 'B';
  };
}

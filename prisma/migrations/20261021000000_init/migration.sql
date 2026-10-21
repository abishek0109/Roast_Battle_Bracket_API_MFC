-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CONTESTANT', 'VOTER');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('REGISTRATION', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MatchupStatus" AS ENUM ('PENDING', 'OPEN', 'CLOSED', 'COMPLETED', 'BYE');

-- CreateEnum
CREATE TYPE "TiebreakStatus" AS ENUM ('PENDING', 'OPEN', 'COMPLETED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VOTER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contestants" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contestants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "TournamentStatus" NOT NULL DEFAULT 'REGISTRATION',
    "votingDurationSeconds" INTEGER NOT NULL DEFAULT 300,
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_contestants" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "contestantId" TEXT NOT NULL,
    "seed" INTEGER,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_contestants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matchups" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "contestantAId" TEXT,
    "contestantBId" TEXT,
    "winnerId" TEXT,
    "status" "MatchupStatus" NOT NULL DEFAULT 'PENDING',
    "votingOpensAt" TIMESTAMP(3),
    "votingClosesAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "matchups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roast_lines" (
    "id" TEXT NOT NULL,
    "matchupId" TEXT NOT NULL,
    "contestantId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roast_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" TEXT NOT NULL,
    "matchupId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "contestantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiebreak_sessions" (
    "id" TEXT NOT NULL,
    "matchupId" TEXT NOT NULL,
    "sessionNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "TiebreakStatus" NOT NULL DEFAULT 'OPEN',
    "winnerId" TEXT,
    "votingOpensAt" TIMESTAMP(3) NOT NULL,
    "votingClosesAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "tiebreak_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiebreak_votes" (
    "id" TEXT NOT NULL,
    "tiebreakSessionId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "contestantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tiebreak_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_outbox" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "notification_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "contestants_email_key" ON "contestants"("email");
CREATE UNIQUE INDEX "contestants_userId_key" ON "contestants"("userId");
CREATE UNIQUE INDEX "tournament_contestants_tournamentId_contestantId_key" ON "tournament_contestants"("tournamentId", "contestantId");
CREATE INDEX "tournament_contestants_tournamentId_idx" ON "tournament_contestants"("tournamentId");
CREATE INDEX "tournament_contestants_contestantId_idx" ON "tournament_contestants"("contestantId");
CREATE UNIQUE INDEX "matchups_tournamentId_roundNumber_position_key" ON "matchups"("tournamentId", "roundNumber", "position");
CREATE INDEX "matchups_tournamentId_roundNumber_idx" ON "matchups"("tournamentId", "roundNumber");
CREATE INDEX "matchups_status_idx" ON "matchups"("status");
CREATE INDEX "matchups_votingClosesAt_idx" ON "matchups"("votingClosesAt");
CREATE UNIQUE INDEX "roast_lines_matchupId_contestantId_key" ON "roast_lines"("matchupId", "contestantId");
CREATE INDEX "roast_lines_matchupId_idx" ON "roast_lines"("matchupId");
CREATE INDEX "roast_lines_contestantId_idx" ON "roast_lines"("contestantId");
CREATE UNIQUE INDEX "votes_matchupId_voterId_key" ON "votes"("matchupId", "voterId");
CREATE INDEX "votes_matchupId_contestantId_idx" ON "votes"("matchupId", "contestantId");
CREATE INDEX "votes_voterId_idx" ON "votes"("voterId");
CREATE UNIQUE INDEX "tiebreak_sessions_matchupId_sessionNumber_key" ON "tiebreak_sessions"("matchupId", "sessionNumber");
CREATE INDEX "tiebreak_sessions_matchupId_idx" ON "tiebreak_sessions"("matchupId");
CREATE UNIQUE INDEX "tiebreak_votes_tiebreakSessionId_voterId_key" ON "tiebreak_votes"("tiebreakSessionId", "voterId");
CREATE INDEX "tiebreak_votes_tiebreakSessionId_contestantId_idx" ON "tiebreak_votes"("tiebreakSessionId", "contestantId");
CREATE INDEX "notification_outbox_status_createdAt_idx" ON "notification_outbox"("status", "createdAt");

-- AddForeignKeys
ALTER TABLE "contestants" ADD CONSTRAINT "contestants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tournament_contestants" ADD CONSTRAINT "tournament_contestants_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tournament_contestants" ADD CONSTRAINT "tournament_contestants_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES "contestants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "matchups" ADD CONSTRAINT "matchups_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "matchups" ADD CONSTRAINT "matchups_contestantAId_fkey" FOREIGN KEY ("contestantAId") REFERENCES "contestants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "matchups" ADD CONSTRAINT "matchups_contestantBId_fkey" FOREIGN KEY ("contestantBId") REFERENCES "contestants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "matchups" ADD CONSTRAINT "matchups_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "contestants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "roast_lines" ADD CONSTRAINT "roast_lines_matchupId_fkey" FOREIGN KEY ("matchupId") REFERENCES "matchups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "roast_lines" ADD CONSTRAINT "roast_lines_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES "contestants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "votes" ADD CONSTRAINT "votes_matchupId_fkey" FOREIGN KEY ("matchupId") REFERENCES "matchups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "votes" ADD CONSTRAINT "votes_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "votes" ADD CONSTRAINT "votes_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES "contestants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tiebreak_sessions" ADD CONSTRAINT "tiebreak_sessions_matchupId_fkey" FOREIGN KEY ("matchupId") REFERENCES "matchups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tiebreak_votes" ADD CONSTRAINT "tiebreak_votes_tiebreakSessionId_fkey" FOREIGN KEY ("tiebreakSessionId") REFERENCES "tiebreak_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tiebreak_votes" ADD CONSTRAINT "tiebreak_votes_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tiebreak_votes" ADD CONSTRAINT "tiebreak_votes_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES "contestants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

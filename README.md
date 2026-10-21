# Roast Battle Bracket API 🥊🔥

> Production-grade REST API for managing single-elimination roast battle tournament brackets with time-boxed voting, deterministic bye allocation, sudden-death tiebreak handling, transactional outbox email notifications, and concurrency-safe voting.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node.js-24+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.4-indigo.svg)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://www.postgresql.org/)
[![OpenAPI](https://img.shields.io/badge/Swagger-OpenAPI%203.0-orange.svg)](http://localhost:3000/api/docs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## 1. Project Overview

The **Roast Battle Bracket API** orchestrates competitive single-elimination roast tournaments. Registered comedians are seeded into brackets, submit sharp roast lines for each matchup, and face off under time-limited public voting windows. The system handles:
- Deterministic bye allocation for any number of contestants ($N \ge 2$, including odd and non-power-of-two participant counts).
- Automatic bye advancement directly into Round 2 without unnecessary voting.
- Concurrency-safe voting with database-level uniqueness guarantees preventing double-voting under concurrent requests.
- Strict server-side deadline enforcement (client clocks are never trusted).
- Automated background expiration workers and on-demand recovery after server restarts.
- Sudden-death re-vote tiebreak sessions with isolated vote histories.
- Transactional Outbox Pattern for email notifications via Nodemailer with local development preview fallback.

---

## 2. Feature List

- **User Authentication & RBAC**: JWT access tokens, bcrypt password hashing (12 salt rounds), and role-based access control (`ADMIN`, `CONTESTANT`, `VOTER`).
- **Contestant Management**: Registration, profile linking, pagination, deletion protection once bracket generation commences (HTTP 409 Conflict), and complete career tournament history.
- **Tournament Lifecycle**: Registration $\to$ In Progress $\to$ Completed with configurable voting durations.
- **Bracket Generation**: Pure deterministic algorithm calculating powers of two, distributing byes, generating round slots, and advancing winners atomically.
- **Roast Line Submissions**: Length validation (5-500 chars), sanitization, participant validation, automated window opening once both competitors submit, and edit-locking once voting begins.
- **Time-Boxed Voting**: Strictly server-enforced UTC windows, self-voting prevention, nonparticipant rejection, rate limiting, and row-level locked serializable transactions.
- **Automated Finalizer Scheduler**: Periodically polls expired matchups and advances winners, recovers missed finalizations upon server restarts, and can be triggered on demand.
- **Sudden-Death Tiebreak Engine**: Multi-session tiebreak capabilities preventing previous round vote contamination.
- **Transactional Email Outbox**: Guarantees email dispatch reliability without rolling back tournament advancements if SMTP is temporarily down.
- **API Documentation**: Interactive Swagger UI at `/api/docs` with complete schemas and examples.
- **Production Readiness**: Helmet security headers, configurable CORS, structured Pino logging with credential redaction, request ID correlation, health probe endpoint, and graceful SIGTERM/SIGINT shutdown.

---

## 3. Architecture & Technology Stack

```
                     ┌──────────────────────────────────────────────┐
                     │            Express.js / Node.js              │
                     │  (Helmet, CORS, Rate Limit, Pino Logger)     │
                     └──────────────────────┬───────────────────────┘
                                            │
                     ┌──────────────────────▼───────────────────────┐
                     │          Validation & Auth Layer             │
                     │          (Zod Schemas + JWT Bearer)          │
                     └──────────────────────┬───────────────────────┘
                                            │
           ┌────────────────────────────────┼────────────────────────────────┐
           │                                │                                │
┌──────────▼──────────┐          ┌──────────▼──────────┐          ┌──────────▼──────────┐
│ Matchups & Voting   │          │ Bracket Calculation │          │ Background Workers  │
│ (Serializable Tx,   │          │ (Deterministic Byes │          │ (Matchup Finalizer, │
│  Unique Constraint) │          │  Power-of-Two Plan) │          │  Outbox Worker)     │
└──────────┬──────────┘          └──────────┬──────────┘          └──────────┬──────────┘
           │                                │                                │
           └────────────────────────────────┼────────────────────────────────┘
                                            │
                     ┌──────────────────────▼───────────────────────┐
                     │          Prisma ORM (PostgreSQL)             │
                     │    (Tables, Enums, Foreign Keys, Indexes)   │
                     └──────────────────────────────────────────────┘
```

- **Runtime**: Node.js v20+ (Tested on v24)
- **Language**: TypeScript 5.8
- **Framework**: Express 4.21
- **Database**: PostgreSQL with Prisma ORM 6.4
- **Validation**: Zod 3.24
- **Security**: bcryptjs, jsonwebtoken, helmet, express-rate-limit
- **Logging**: Pino with pino-pretty
- **Documentation**: Swagger UI Express / OpenAPI 3.0
- **Testing**: Vitest & Supertest

---

## 4. Prerequisites

- **Node.js**: v20.x or higher
- **npm**: v9.x or higher
- **PostgreSQL**: v14+ (Local instance, Docker container, or hosted service like Neon/Supabase)

---

## 5. Installation Steps

1. Clone or navigate to the project directory:
   ```bash
   cd "Roast Battle Bracket API"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

---

## 6. PostgreSQL Setup

Create a PostgreSQL database for the application:

```sql
CREATE DATABASE roast_battle;
```

If using Docker:
```bash
docker run --name roast-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=roast_battle -p 5432:5432 -d postgres:16-alpine
```

---

## 7. Environment Configuration

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Review and adjust variables in `.env`:
```env
# Database Configuration (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/roast_battle?schema=public"

# Authentication
JWT_SECRET="super-secret-jwt-key-change-in-production-min-32-chars-long"
JWT_EXPIRES_IN="24h"

# Server Configuration
PORT=3000
NODE_ENV="development"
CORS_ORIGIN="*"

# Tournament & Matchup Rules
VOTING_DURATION_SECONDS=300
MATCHUP_SCHEDULER_INTERVAL_MS=3000
ALLOW_LIVE_VOTE_COUNTS=false

# Email Notification Configuration (Nodemailer)
SMTP_HOST=""
SMTP_PORT=2525
SMTP_SECURE=false
SMTP_USER=""
SMTP_PASS=""
EMAIL_FROM="roastmaster@bracket.battle"
```

> **Note**: If `SMTP_HOST` is left empty, the application runs in development preview mode where outgoing emails are logged cleanly without requiring SMTP credentials.

---

## 8. Database Migrations

Generate Prisma Client:
```bash
npm run db:generate
```

Run database migrations:
```bash
npm run db:migrate
```

For production deployment:
```bash
npm run db:migrate:deploy
```

---

## 9. Seed Instructions

Populate the database with sample data (1 Admin, 5 Contestants demonstrating a non-power-of-two bracket, 3 Voters, and 1 Tournament):

```bash
npm run db:seed
```

### Preconfigured Seed Credentials:
- **Default Password (all users)**: `Password123!`
- **Administrator**: `admin@roastbattle.com` (Role: `ADMIN`)
- **Contestants**:
  - `jeff@roastbattle.com` (Jeff Ross, Seed 1)
  - `nikki@roastbattle.com` (Nikki Glaser, Seed 2)
  - `tony@roastbattle.com` (Tony Hinchcliffe, Seed 3)
  - `sarah@roastbattle.com` (Sarah Silverman, Seed 4)
  - `bill@roastbattle.com` (Bill Burr, Seed 5)
- **Voters**: `voter1@roastbattle.com`, `voter2@roastbattle.com`, `voter3@roastbattle.com`

---

## 10. Local Development

Start the development server with live reload:
```bash
npm run dev
```

The server starts at `http://localhost:3000`.
- API Base Path: `http://localhost:3000/api/v1` (Root routes also supported)
- Interactive Documentation: `http://localhost:3000/api/docs`
- Health Probe: `http://localhost:3000/health`

---

## 11. Production Build & Start

1. Compile TypeScript to JavaScript:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

---

## 12. API Endpoint Directory

All endpoints are available under `/api/v1` and root `/`:

| Method | Endpoint | Description | Role / Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | API & database health probe | Public |
| `GET` | `/api/docs` | Swagger OpenAPI UI | Public |
| **Auth** | | | |
| `POST` | `/api/v1/auth/register` | Register new user account | Public |
| `POST` | `/api/v1/auth/login` | Login and receive JWT access token | Public |
| `GET` | `/api/v1/auth/me` | Retrieve authenticated profile | Authenticated |
| **Contestants** | | | |
| `POST` | `/api/v1/contestants` | Register contestant profile | Public / User |
| `GET` | `/api/v1/contestants` | List contestants with pagination | Public |
| `GET` | `/api/v1/contestants/:id` | Get contestant details | Public |
| `PATCH` | `/api/v1/contestants/:id` | Update profile | Owner / Admin |
| `DELETE` | `/api/v1/contestants/:id` | Delete contestant (only before bracket generation) | Owner / Admin |
| `GET` | `/api/v1/contestant/:id/history` | Contestant career history & match stats | Public |
| **Tournaments** | | | |
| `POST` | `/api/v1/tournaments` | Create new tournament | Admin |
| `GET` | `/api/v1/tournaments` | List tournaments | Public |
| `GET` | `/api/v1/tournaments/:id` | Get tournament details | Public |
| `PATCH` | `/api/v1/tournaments/:id` | Update tournament settings or status | Admin |
| `POST` | `/api/v1/tournaments/:id/contestants` | Enroll contestant in tournament | Admin |
| `GET` | `/api/v1/tournament/:id/winner` | Retrieve tournament champion | Public |
| **Brackets** | | | |
| `POST` | `/api/v1/bracket/generate` | Generate single-elimination bracket | Admin |
| `GET` | `/api/v1/bracket/:tournamentId` | Full structured bracket tree & live timers | Public |
| **Roast Lines** | | | |
| `POST` | `/api/v1/matchup/:matchupId/roast-lines` | Submit roast line for matchup | Contestant / Admin |
| `GET` | `/api/v1/matchup/:matchupId/roast-lines` | Get roast lines for matchup | Public |
| `PATCH` | `/api/v1/roast-lines/:id` | Update roast line (before voting opens) | Owner / Admin |
| `DELETE` | `/api/v1/roast-lines/:id` | Delete roast line (before voting opens) | Owner / Admin |
| **Voting** | | | |
| `POST` | `/api/v1/vote/:matchupId` | Submit vote for competitor in open matchup | Authenticated |
| `GET` | `/api/v1/matchup/:id/status` | Matchup status & remaining seconds | Public |
| `GET` | `/api/v1/matchup/:id/results` | Vote totals, percentages & winner | Public |
| `POST` | `/api/v1/matchup/:id/tiebreak` | Initiate or force sudden-death tiebreak | Authenticated / Admin |
| **Rounds** | | | |
| `POST` | `/api/v1/round/advance` | Administrative verified round advancement | Admin |

---

## 13. Authentication & Authorization

Authentication uses JSON Web Tokens (JWT) passed in the HTTP `Authorization` header:
```http
Authorization: Bearer <TOKEN>
```

### Roles:
- **`ADMIN`**: Create tournaments, generate brackets, force tiebreaks, trigger administrative advancement.
- **`CONTESTANT`**: Submit roast lines for own matchups, manage own contestant profile.
- **`VOTER`**: Vote in open matchups. Contestants can also vote, but self-voting is strictly forbidden.

---

## 14. Voting Concurrency Strategy

Preventing corrupted counts and duplicate votes under high concurrency is a core architectural guarantee:

1. **Database-Level Unique Constraint**:
   ```prisma
   model Vote {
     // ...
     @@unique([matchupId, voterId])
   }
   ```
   At the physical database level, PostgreSQL rejects any attempt to insert a second vote for the same `(matchupId, voterId)` tuple.
2. **Serializable Transaction Isolation**:
   Vote submissions execute inside `Prisma.TransactionIsolationLevel.Serializable` transactions.
3. **Double Verification**:
   The service checks for existing votes prior to insertion and catches PostgreSQL unique-constraint violations (`P2002`), returning a clean `409 Conflict` ("You have already voted in this matchup").
4. **Authoritative Vote Aggregation**:
   Vote totals are never read into Node.js application memory, incremented, and saved back. The `Vote` table is the sole source of truth; counts are derived via atomic SQL aggregation (`COUNT(*)`).

---

## 15. Server-Side Deadline Enforcement

Frontend countdowns are purely visual and **never** trusted for authorization.
1. When a matchup opens, `votingOpensAt` and `votingClosesAt` are recorded on the server as UTC timestamps.
2. Inside the atomic vote transaction, the server executes:
   ```typescript
   if (now >= matchup.votingClosesAt) {
     throw new VotingClosedError('Voting window has closed'); // HTTP 409
   }
   ```
3. Any vote arriving at or after `votingClosesAt` is rejected immediately.
4. Remaining time returned in API responses is computed dynamically on the server: `Math.max(0, Math.floor((votingClosesAt - now) / 1000))`.

---

## 16. Deterministic Bye Allocation Algorithm

For any tournament with $N \ge 2$ contestants:
1. **Next Power of Two ($P$)**:
   $$P = 2^{\lceil \log_2 N \rceil}$$
   Total rounds: $R = \log_2 P$.
2. **First-Round Matchup Slots ($M_1$)**:
   $$M_1 = P / 2$$
3. **Required Byes ($B$)**:
   $$B = P - N$$
4. **Real Matches in Round 1 ($M_{real}$)**:
   $$M_{real} = M_1 - B = N - P / 2$$
5. **Deterministic Slot Seeding**:
   - Positions $1 \dots M_{real}$ are seeded with 2 contestants each (real matchups).
   - Positions $(M_{real} + 1) \dots M_1$ receive 1 contestant (Contestant A) and `null` for Contestant B.
   - Bye matchups are marked with `status = 'BYE'`, `winnerId = contestantAId`, and `completedAt = now()`.
   - The bye recipient **automatically advances immediately** into Round 2 at target position $\lceil \text{position} / 2 \rceil$ (slot A if position is odd, slot B if position is even).
   - No contestant receives multiple byes in the same round.
   - All subsequent round matchup shells ($R_2 \dots R$) are created in the same atomic transaction, ensuring a stable, immutable tree.

#### Example ($N = 5$ contestants):
- Next power of two: $P = 8$.
- First-round slots: $M_1 = 4$.
- Byes: $B = 8 - 5 = 3$ byes.
- Real matches: $4 - 3 = 1$ real match (2 contestants).
- Matchup 1: Contestant 1 vs Contestant 2 (Real match $\to$ Winner to R2P1 Slot A).
- Matchup 2: Contestant 3 vs BYE (Auto-winner Contestant 3 $\to$ Advanced to R2P1 Slot B).
- Matchup 3: Contestant 4 vs BYE (Auto-winner Contestant 4 $\to$ Advanced to R2P2 Slot A).
- Matchup 4: Contestant 5 vs BYE (Auto-winner Contestant 5 $\to$ Advanced to R2P2 Slot B).
- Round 2 has 2 matchups; Round 3 has 1 matchup (Finals).

---

## 17. Automatic Advancement & Background Worker

1. **Periodic Scheduler (`MatchupFinalizerScheduler`)**:
   - Polls every 3000ms (`MATCHUP_SCHEDULER_INTERVAL_MS`).
   - Identifies all `OPEN` matchups where `votingClosesAt <= now()`.
   - Finalizes each matchup in an atomic transaction:
     - Tallies votes for Contestants A and B.
     - Detects ties or selects the winner.
     - Advances the winner to the next round.
     - If the matchup is the final championship match, marks the tournament `COMPLETED`.
     - Queues an advancement notification in the transactional outbox.
2. **On-Demand Finalization**:
   - Any client request to `GET /matchup/:id/status`, `GET /matchup/:id/results`, or `POST /round/advance` triggers instantaneous finalization if `now >= votingClosesAt`, eliminating any polling delay.
3. **Crash Recovery**:
   - Upon server startup, the scheduler executes an immediate sweep to finalize any matchups that expired while the server was offline.

---

## 18. Tiebreak Policy

When an active voting window closes with equal votes ($V_A = V_B$):
1. The matchup is marked as tied. Original vote counts remain intact in the database for auditability.
2. A **`TiebreakSession`** is created with a fresh voting deadline (`votingOpensAt = now`, `votingClosesAt = now + votingDurationSeconds`).
3. Tiebreak votes are stored in a dedicated `TiebreakVote` table with constraint `@@unique([tiebreakSessionId, voterId])`. Original round votes are excluded from tiebreak tallies.
4. If a tiebreak session expires with yet another tie, a subsequent sudden-death session ($N+1$) is initiated automatically.

---

## 19. Transactional Outbox Email Notifications

Advancement emails use the **Transactional Outbox Pattern**:
1. When a winner is advanced, an event record is written to `NotificationOutbox` **inside the same database transaction**.
2. If the transaction rolls back, no email is scheduled.
3. An asynchronous worker (`OutboxWorker`) polls `NotificationOutbox` every 5 seconds, dispatching emails via Nodemailer.
4. Failed sends increment `attempts` and retry with backoff up to 5 times. Email service downtime never impedes bracket progression or database transactions.

---

## 20. End-to-End API Workflow (cURL Examples)

### Step 1: Register an Administrator
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Roast Master",
    "email": "master@roastbattle.com",
    "password": "Password123!",
    "role": "ADMIN"
  }'
```

### Step 2: Login to Obtain JWT Token
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "master@roastbattle.com",
    "password": "Password123!"
  }'
```
*Export the returned token:*
```bash
export TOKEN="<COPIED_JWT_TOKEN>"
```

### Step 3: Create a Tournament
```bash
curl -X POST http://localhost:3000/api/v1/tournaments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Summer Roast Clash 2026",
    "votingDurationSeconds": 60
  }'
```
*Export the returned tournament ID:*
```bash
export TOURNAMENT_ID="<TOURNAMENT_ID>"
```

### Step 4: Register Contestants
```bash
curl -X POST http://localhost:3000/api/v1/contestants \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Roaster One",
    "email": "roaster1@battle.com",
    "tournamentId": "'$TOURNAMENT_ID'"
  }'

curl -X POST http://localhost:3000/api/v1/contestants \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Roaster Two",
    "email": "roaster2@battle.com",
    "tournamentId": "'$TOURNAMENT_ID'"
  }'
```

### Step 5: Generate Tournament Bracket
```bash
curl -X POST http://localhost:3000/api/v1/bracket/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tournamentId": "'$TOURNAMENT_ID'"
  }'
```

### Step 6: View Full Bracket
```bash
curl -X GET http://localhost:3000/api/v1/bracket/$TOURNAMENT_ID
```

### Step 7: Submit Roast Lines
```bash
export MATCHUP_ID="<MATCHUP_ID_FROM_BRACKET>"
export CONTESTANT_A_ID="<CONTESTANT_A_ID>"
export CONTESTANT_B_ID="<CONTESTANT_B_ID>"

# Contestant A line
curl -X POST http://localhost:3000/api/v1/matchup/$MATCHUP_ID/roast-lines \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "You look like a before picture for a product that does not exist.",
    "contestantId": "'$CONTESTANT_A_ID'"
  }'

# Contestant B line (Voting automatically opens once both submit!)
curl -X POST http://localhost:3000/api/v1/matchup/$MATCHUP_ID/roast-lines \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Your stand-up special was so boring, even insomnia took notes.",
    "contestantId": "'$CONTESTANT_B_ID'"
  }'
```

### Step 8: Cast a Vote
```bash
curl -X POST http://localhost:3000/api/v1/vote/$MATCHUP_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contestantId": "'$CONTESTANT_A_ID'"
  }'
```

### Step 9: Check Matchup Status & Live Remaining Seconds
```bash
curl -X GET http://localhost:3000/api/v1/matchup/$MATCHUP_ID/status
```

### Step 10: View Matchup Results
```bash
curl -X GET http://localhost:3000/api/v1/matchup/$MATCHUP_ID/results
```

### Step 11: Retrieve Tournament Champion
```bash
curl -X GET http://localhost:3000/api/v1/tournament/$TOURNAMENT_ID/winner
```

---

## 21. Automated Testing

The test suite is partitioned into unit tests and database integration tests:

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run all tests together
npm run test:all
```

---

## 22. Known Design Decisions & Trade-offs

1. **Vote Count Visibility**: Detailed vote percentages can be hidden during active voting windows via `ALLOW_LIVE_VOTE_COUNTS=false` to prevent herd mentality and late-voting bias.
2. **Transactional Outbox vs In-Memory Events**: Outbox events are preferred over direct synchronous Nodemailer calls. This prevents network latency or SMTP downtime from aborting matchup finalization transactions.
3. **On-Demand Finalization Fallback**: While the background worker checks for expired matches every 3 seconds, endpoints dynamically finalize expired matchups upon lookup to guarantee zero delay for API consumers.

---

## 23. Deployment Setup (Render & Docker)

### Deploy to Render
The repository includes a ready-to-use `render.yaml` blueprint:
1. Connect your GitHub repository to [Render](https://render.com).
2. Create a **Blueprint Instance**. Render will automatically provision:
   - A managed PostgreSQL instance (`roast-postgres`).
   - The Web Service running Node.js with automated migrations and Prisma client generation.
3. Once deployed, the interactive Swagger documentation will be live at `https://<your-service>.onrender.com/api/docs`.

### Deploy with Docker
```bash
docker compose up --build -d
```

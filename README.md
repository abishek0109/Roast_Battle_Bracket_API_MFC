# Roast Battle Bracket API 🥊🔥

> Production-grade REST API and Interactive Tournament Arena for managing single-elimination roast battles with time-boxed voting, deterministic bye allocation, sudden-death tiebreak handling, transactional outbox email notifications, and concurrency-safe voting.

[![Live Website](https://img.shields.io/badge/Live%20Website-GitHub%20Pages-success.svg?style=for-the-badge&logo=github)](https://abishek0109.github.io/Roast_Battle_Bracket_API_MFC/)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/abishek0109/Roast_Battle_Bracket_API_MFC)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node.js-24+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.4-indigo.svg)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://www.postgresql.org/)
[![OpenAPI](https://img.shields.io/badge/Swagger-OpenAPI%203.0-orange.svg)](https://roast-battle-bracket-api.onrender.com/api/docs)
[![Tests](https://img.shields.io/badge/Tests-55%20Passed-brightgreen.svg)](./tests)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## 🌐 Live Website & Links

| Service | Live Link |
| :--- | :--- |
| 🥊 **Live Web Arena & Bracket Dashboard** | **[https://abishek0109.github.io/Roast_Battle_Bracket_API_MFC/](https://abishek0109.github.io/Roast_Battle_Bracket_API_MFC/)** |
| 📚 **Interactive Swagger API Docs** | **[https://roast-battle-bracket-api.onrender.com/api/docs](https://roast-battle-bracket-api.onrender.com/api/docs)** |
| 🩺 **Backend API Health Probe** | **[https://roast-battle-bracket-api.onrender.com/health](https://roast-battle-bracket-api.onrender.com/health)** |
| 🐙 **GitHub Repository** | **[https://github.com/abishek0109/Roast_Battle_Bracket_API_MFC](https://github.com/abishek0109/Roast_Battle_Bracket_API_MFC)** |

---

## 🌟 Live Web Arena & Interactive Dashboard

The live frontend is hosted on **GitHub Pages** and serves an interactive dashboard:

- **🏆 Visual Bracket Arena**: Renders an interactive single-elimination tournament tree with seed indicators, auto-bye banners, and live match statuses.
- **🔴 Real-Time Matchup Arena**: Displays the active battle with head-to-head competitor cards, submitted roast lines in speech bubbles, a live countdown timer, and interactive vote submission.
- **🎙️ Comedian Roster**: Directory of participating roast comedians with seed ranks, titles, and stats.
- **⚡ Quick API Playground**: Live copyable cURL commands and endpoint execution blocks.
- **📚 Interactive Swagger Docs**: Integrated link to live OpenAPI documentation.

Visit the live website at: **[https://abishek0109.github.io/Roast_Battle_Bracket_API_MFC/](https://abishek0109.github.io/Roast_Battle_Bracket_API_MFC/)**

---

## 1. Project Overview

The **Roast Battle Bracket API** orchestrates competitive single-elimination comedy roast tournaments. Registered comedians are seeded into brackets, submit sharp roast lines for each matchup, and face off under time-limited public voting windows. The system handles:

- **Deterministic Bye Allocation**: For any number of contestants ($N \ge 2$, including odd numbers and counts that are not powers of two).
- **Automatic Bye Advancement**: Contestants receiving byes advance immediately to Round 2 without unnecessary voting.
- **Concurrency-Safe Voting**: Database-level unique constraint on `(matchupId, voterId)` and serializable transactions guarantee that duplicate votes are impossible under high concurrency.
- **Strict Server-Side Deadlines**: Server-recorded UTC timestamps govern voting eligibility; client clocks are never trusted.
- **Automated Background Workers**: Periodic scheduler finalizes expired matchups and recovers missed state upon server restarts.
- **Sudden-Death Tiebreak Engine**: Dedicated multi-session tiebreak tables preventing previous round vote contamination.
- **Transactional Outbox Email Notifications**: Guarantees email dispatch reliability without rolling back tournament advancements if SMTP is temporarily unavailable.

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

- **Runtime**: Node.js v20+ (Tested on Node v24)
- **Language**: TypeScript 5.8
- **Framework**: Express 4.21
- **Database**: PostgreSQL with Prisma ORM 6.4
- **Validation**: Zod 3.24
- **Security**: bcryptjs, jsonwebtoken, helmet, express-rate-limit
- **Logging**: Pino with pino-pretty
- **Documentation**: Swagger UI Express / OpenAPI 3.0
- **Testing**: Vitest 3.0 & Supertest 7.0

---

## 4. Prerequisites

- **Node.js**: v20.x or higher
- **npm**: v9.x or higher
- **PostgreSQL**: v14+ (Local instance, Docker container, or cloud database like Neon / Supabase / Render)

---

## 5. Deployment Guide

### Deploy to Render (One-Click)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/abishek0109/Roast_Battle_Bracket_API_MFC)

The repository includes a [`render.yaml`](./render.yaml) blueprint that automates full deployment:
1. Click the **Deploy to Render** button above or connect `abishek0109/Roast_Battle_Bracket_API_MFC` in [Render](https://render.com).
2. Render provisions:
   - A free managed **PostgreSQL database** (`roast-battle-db`).
   - A **Web Service** (`roast-battle-bracket-api`) running migrations, seeds, and the server.
3. Access your live app at `https://<your-service>.onrender.com/` and Swagger docs at `https://<your-service>.onrender.com/api/docs`.

### Deploy with Docker Compose
Run the entire production stack (API + PostgreSQL) with a single command:
```bash
docker compose up --build -d
```
- App & Dashboard: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/api/docs`
- Health Probe: `http://localhost:3000/health`

---

## 6. Local Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/abishek0109/Roast_Battle_Bracket_API_MFC.git
   cd Roast_Battle_Bracket_API_MFC
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   ```

4. **Run database migrations & seed**:
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

5. **Start local development server**:
   ```bash
   npm run dev
   ```

---

## 7. Preconfigured Seed Credentials

When `npm run db:seed` runs, the following test accounts are populated:

- **Default Password (all accounts)**: `Password123!`
- **Administrator**: `admin@roastbattle.com` (Role: `ADMIN`)
- **Contestants** (Demonstrating a 5-player non-power-of-two bracket):
  - `jeff@roastbattle.com` (Jeff Ross, Seed #1)
  - `nikki@roastbattle.com` (Nikki Glaser, Seed #2)
  - `tony@roastbattle.com` (Tony Hinchcliffe, Seed #3)
  - `sarah@roastbattle.com` (Sarah Silverman, Seed #4)
  - `bill@roastbattle.com` (Bill Burr, Seed #5)
- **Voters**: `voter1@roastbattle.com`, `voter2@roastbattle.com`, `voter3@roastbattle.com`

---

## 8. API Endpoint Directory

All endpoints are available under both `/api/v1` and root `/`:

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Live Interactive Web Arena & Bracket Visualizer | Public |
| `GET` | `/health` | API & database health probe | Public |
| `GET` | `/api/docs` | Swagger OpenAPI Documentation UI | Public |
| **Auth** | | | |
| `POST` | `/api/v1/auth/register` | Register new user account | Public |
| `POST` | `/api/v1/auth/login` | Authenticate user and receive JWT | Public |
| `GET` | `/api/v1/auth/me` | Retrieve authenticated profile | Authenticated |
| **Contestants** | | | |
| `POST` | `/api/v1/contestants` | Register contestant profile | Public / User |
| `GET` | `/api/v1/contestants` | List contestants with pagination | Public |
| `GET` | `/api/v1/contestants/:id` | Get contestant details | Public |
| `PATCH` | `/api/v1/contestants/:id` | Update contestant profile | Owner / Admin |
| `DELETE` | `/api/v1/contestants/:id` | Delete contestant (only before bracket generation) | Owner / Admin |
| `GET` | `/api/v1/contestant/:id/history` | Contestant career match history & stats | Public |
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

## 9. Voting Concurrency Strategy

Preventing corrupted counts and duplicate votes under high concurrency is a core architectural guarantee:

1. **Database-Level Unique Constraint**:
   ```prisma
   model Vote {
     // ...
     @@unique([matchupId, voterId])
   }
   ```
   PostgreSQL enforces that no voter can insert a duplicate vote in the same matchup, even during simultaneous concurrent requests.
2. **Serializable Transaction Isolation**:
   Vote submissions execute inside `Prisma.TransactionIsolationLevel.Serializable` transactions.
3. **Double Verification**:
   The service verifies existing votes prior to insertion and catches PostgreSQL unique-constraint violations (`P2002`), returning a clean `409 Conflict` ("You have already voted in this matchup").
4. **Authoritative Vote Aggregation**:
   Vote totals are never read into Node.js application memory, incremented, and saved back. The `Vote` table is the sole source of truth; counts are derived via atomic SQL aggregation (`COUNT(*)`).

---

## 10. Deterministic Bye Allocation Algorithm

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

#### Example ($N = 5$ contestants):
- Next power of two: $P = 8$.
- First-round slots: $M_1 = 4$.
- Byes: $B = 8 - 5 = 3$ byes.
- Real matches: $4 - 3 = 1$ real match (2 contestants).
- **Matchup 1**: Contestant 1 vs Contestant 2 (Real match $\to$ Winner to Round 2, Position 1, Slot A).
- **Matchup 2**: Contestant 3 vs BYE (Auto-winner Contestant 3 $\to$ Advanced to Round 2, Position 1, Slot B).
- **Matchup 3**: Contestant 4 vs BYE (Auto-winner Contestant 4 $\to$ Advanced to Round 2, Position 2, Slot A).
- **Matchup 4**: Contestant 5 vs BYE (Auto-winner Contestant 5 $\to$ Advanced to Round 2, Position 2, Slot B).
- Round 2 has 2 matchups; Round 3 has 1 matchup (Finals).

---

## 11. Automated Test Suite (55 Tests Passed)

The test suite covers unit and integration scenarios across all business logic:

| Test Suite | Tests Passed | Status |
| :--- | :---: | :---: |
| `bracket-calculator.test.ts` | 12 / 12 | ✅ Passed |
| `validation-schemas.test.ts` | 13 / 13 | ✅ Passed |
| `business-rules.test.ts` | 9 / 9 | ✅ Passed |
| `crypto-and-auth.test.ts` | 3 / 3 | ✅ Passed |
| `notification-outbox.test.ts` | 1 / 1 | ✅ Passed |
| `auth.integration.test.ts` | 5 / 5 | ✅ Passed |
| `tournaments-and-contestants.integration.test.ts` | 5 / 5 | ✅ Passed |
| `bracket-and-advancement.integration.test.ts` | 3 / 3 | ✅ Passed |
| `matchup-voting.integration.test.ts` | 4 / 4 | ✅ Passed |
| **Total** | **55 / 55** | **100% Passed** |

Execute tests locally with:
```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run all tests together
npm run test:all
```

---

## 12. End-to-End API Workflow (cURL Examples)

### 1. Register Admin
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Roast Master", "email": "master@roastbattle.com", "password": "Password123!", "role": "ADMIN"}'
```

### 2. Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "master@roastbattle.com", "password": "Password123!"}'
```

### 3. Create Tournament
```bash
curl -X POST http://localhost:3000/api/v1/tournaments \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Summer Roast Clash 2026", "votingDurationSeconds": 300}'
```

### 4. Register Contestants
```bash
curl -X POST http://localhost:3000/api/v1/contestants \
  -H "Content-Type: application/json" \
  -d '{"displayName": "Roaster One", "email": "roaster1@battle.com", "tournamentId": "<TOURNAMENT_ID>"}'
```

### 5. Generate Bracket
```bash
curl -X POST http://localhost:3000/api/v1/bracket/generate \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"tournamentId": "<TOURNAMENT_ID>"}'
```

### 6. Submit Roast Line
```bash
curl -X POST http://localhost:3000/api/v1/matchup/<MATCHUP_ID>/roast-lines \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"content": "Your stand-up special was so boring, even insomnia took notes."}'
```

### 7. Cast a Vote
```bash
curl -X POST http://localhost:3000/api/v1/vote/<MATCHUP_ID> \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"contestantId": "<CONTESTANT_ID>"}'
```

### 8. View Tournament Champion
```bash
curl -X GET http://localhost:3000/api/v1/tournament/<TOURNAMENT_ID>/winner
```

---

## 13. License

Distributed under the MIT License. See [`LICENSE`](./LICENSE) for details.

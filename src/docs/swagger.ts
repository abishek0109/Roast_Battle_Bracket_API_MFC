import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Roast Battle Bracket API',
    version: '1.0.0',
    description: `
## Roast Battle Bracket REST API
A production-grade tournament management platform for roast battles with time-boxed voting, deterministic single-elimination bracket generation, sudden-death tiebreak sessions, transactional outbox email notifications, and concurrency-safe voting.

### Key Features & Architectural Highlights
- **Deterministic Bye Allocation**: Power-of-two expansion ($P = 2^{\\lceil \\log_2 N \\rceil}$) with $B = P - N$ byes automatically advancing to Round 2 without voting.
- **Concurrency & Vote Integrity**: Database-level unique constraint on \`(matchupId, voterId)\`, serializable transactions, and atomic SQL counters prevent duplicate votes and corrupted counts.
- **Server-Side Deadline Enforcement**: Server-recorded UTC timestamps determine window validity; frontend countdowns are never trusted.
- **Sudden-Death Tiebreak**: Configurable re-vote sessions with isolated tiebreak vote tables and clean audit trails.
- **Transactional Outbox Pattern**: Advancement notifications are committed in the same database transaction as matchup completion and dispatched asynchronously with automatic retries.
    `,
    contact: {
      name: 'Roastmaster Backend Team',
      email: 'roastmaster@bracket.battle',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 Default Base Path',
    },
    {
      url: '/',
      description: 'Root URL Base Path',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token (e.g. from /auth/login or /auth/register)',
      },
    },
    schemas: {
      StandardResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
          data: { type: 'object' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'CONFLICT' },
              message: { type: 'string', example: 'You have already voted in this matchup' },
              details: { type: 'object' },
            },
          },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', example: 'Jeff Ross' },
          email: { type: 'string', format: 'email', example: 'jeff@roastbattle.com' },
          password: { type: 'string', format: 'password', example: 'securePassword123' },
          role: { type: 'string', enum: ['ADMIN', 'CONTESTANT', 'VOTER'], default: 'VOTER' },
          displayName: { type: 'string', example: 'The Roastmaster General' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'jeff@roastbattle.com' },
          password: { type: 'string', format: 'password', example: 'securePassword123' },
        },
      },
      CreateTournamentRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', example: 'Comedy Store Roast Invitational 2026' },
          votingDurationSeconds: { type: 'integer', default: 300, example: 300 },
        },
      },
      CreateContestantRequest: {
        type: 'object',
        required: ['displayName', 'email'],
        properties: {
          displayName: { type: 'string', example: 'Tony Hinchcliffe' },
          email: { type: 'string', format: 'email', example: 'tony@roastbattle.com' },
          tournamentId: { type: 'string', format: 'uuid' },
        },
      },
      GenerateBracketRequest: {
        type: 'object',
        required: ['tournamentId'],
        properties: {
          tournamentId: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
        },
      },
      SubmitRoastLineRequest: {
        type: 'object',
        required: ['content'],
        properties: {
          content: {
            type: 'string',
            minLength: 5,
            maxLength: 500,
            example: 'Your career has fewer hits than a rotary phone in an airport.',
          },
          contestantId: { type: 'string', format: 'uuid' },
        },
      },
      VoteRequest: {
        type: 'object',
        required: ['contestantId'],
        properties: {
          contestantId: { type: 'string', format: 'uuid', example: '223e4567-e89b-12d3-a456-426614174001' },
        },
      },
      TiebreakRequest: {
        type: 'object',
        properties: {
          force: { type: 'boolean', default: false },
          durationSeconds: { type: 'integer', default: 300 },
        },
      },
      AdvanceRoundRequest: {
        type: 'object',
        properties: {
          tournamentId: { type: 'string', format: 'uuid' },
          matchupId: { type: 'string', format: 'uuid' },
          roundNumber: { type: 'integer' },
        },
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user account',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } },
        },
        responses: {
          201: { description: 'User registered successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          409: { description: 'User email already exists' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Authenticate user and return JWT',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          200: { description: 'Authenticated successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          401: { description: 'Invalid email or password' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Retrieve authenticated user profile',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Current user retrieved' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/contestants': {
      get: {
        tags: ['Contestants'],
        summary: 'List contestants with pagination',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Paginated contestants list' } },
      },
      post: {
        tags: ['Contestants'],
        summary: 'Register a new contestant',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateContestantRequest' } } },
        },
        responses: {
          201: { description: 'Contestant registered' },
          409: { description: 'Email already registered' },
        },
      },
    },
    '/contestants/{id}': {
      get: {
        tags: ['Contestants'],
        summary: 'Get contestant details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Contestant details' }, 404: { description: 'Not found' } },
      },
      patch: {
        tags: ['Contestants'],
        summary: 'Update contestant details (Owner or Admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Contestant updated' }, 403: { description: 'Forbidden' } },
      },
      delete: {
        tags: ['Contestants'],
        summary: 'Delete contestant (Only permitted before bracket generation)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Contestant deleted' },
          409: { description: 'Conflict: Cannot delete contestant after bracket is generated' },
        },
      },
    },
    '/contestant/{id}/history': {
      get: {
        tags: ['Contestants'],
        summary: 'Get contestant tournament history, matchups, votes, and outcomes',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Contestant history details' }, 404: { description: 'Not found' } },
      },
    },
    '/tournaments': {
      get: {
        tags: ['Tournaments'],
        summary: 'List tournaments with pagination and status filters',
        responses: { 200: { description: 'Tournaments list' } },
      },
      post: {
        tags: ['Tournaments'],
        summary: 'Create a new tournament (Admin only)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateTournamentRequest' } } },
        },
        responses: { 201: { description: 'Tournament created' }, 403: { description: 'Forbidden' } },
      },
    },
    '/tournaments/{id}': {
      get: {
        tags: ['Tournaments'],
        summary: 'Get tournament details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Tournament details' }, 404: { description: 'Not found' } },
      },
      patch: {
        tags: ['Tournaments'],
        summary: 'Update tournament settings or status (Admin only)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Tournament updated' }, 409: { description: 'Settings locked' } },
      },
    },
    '/tournaments/{id}/contestants': {
      post: {
        tags: ['Tournaments'],
        summary: 'Enroll a contestant into a tournament (Admin only)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 201: { description: 'Enrolled successfully' } },
      },
    },
    '/tournament/{id}/winner': {
      get: {
        tags: ['Tournaments'],
        summary: 'Get tournament champion (Only returns champion when tournament is completed)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Tournament champion outcome or progress status' } },
      },
    },
    '/bracket/generate': {
      post: {
        tags: ['Brackets'],
        summary: 'Generate single-elimination bracket with deterministic bye allocation (Admin only)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/GenerateBracketRequest' } } },
        },
        responses: {
          201: { description: 'Bracket generated and Round 1 byes auto-advanced' },
          409: { description: 'Bracket has already been generated' },
        },
      },
    },
    '/bracket/{tournamentId}': {
      get: {
        tags: ['Brackets'],
        summary: 'Get full structured bracket with all rounds, positions, matchups, roast lines, and live time',
        parameters: [{ name: 'tournamentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Structured bracket tree' } },
      },
    },
    '/matchup/{matchupId}/roast-lines': {
      post: {
        tags: ['Roast Lines'],
        summary: 'Submit a roast line for a matchup (Contestant or Admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'matchupId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SubmitRoastLineRequest' } } },
        },
        responses: {
          201: { description: 'Roast line submitted. If both contestants submitted, voting opens automatically.' },
          403: { description: 'Contestant not in this matchup' },
          409: { description: 'Line already submitted or matchup not PENDING' },
        },
      },
      get: {
        tags: ['Roast Lines'],
        summary: 'Get submitted roast lines for a matchup',
        parameters: [{ name: 'matchupId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Roast lines list' } },
      },
    },
    '/roast-lines/{id}': {
      patch: {
        tags: ['Roast Lines'],
        summary: 'Update roast line content before voting opens (Owner or Admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Roast line updated' }, 409: { description: 'Locked once voting opens' } },
      },
      delete: {
        tags: ['Roast Lines'],
        summary: 'Delete roast line before voting opens (Owner or Admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Deleted' }, 409: { description: 'Locked once voting opens' } },
      },
    },
    '/vote/{matchupId}': {
      post: {
        tags: ['Voting'],
        summary: 'Submit vote for a contestant in an OPEN matchup',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'matchupId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/VoteRequest' } } },
        },
        responses: {
          201: { description: 'Vote successfully recorded' },
          400: { description: 'Contestant not in matchup or window closed' },
          403: { description: 'Self-voting forbidden' },
          409: { description: 'Duplicate vote or voting window closed (code: VOTING_WINDOW_CLOSED)' },
          429: { description: 'Rate limit exceeded' },
        },
      },
    },
    '/matchup/{id}/status': {
      get: {
        tags: ['Matchups'],
        summary: 'Get matchup status and server-calculated remaining time (Triggers auto-finalization if expired)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Matchup status and remaining seconds' } },
      },
    },
    '/matchup/{id}/results': {
      get: {
        tags: ['Matchups'],
        summary: 'Get matchup results, vote totals, percentages, winner, and tiebreak information',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Matchup results' } },
      },
    },
    '/matchup/{id}/tiebreak': {
      post: {
        tags: ['Matchups'],
        summary: 'Initiate or manage a sudden-death tiebreak session',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TiebreakRequest' } } },
        },
        responses: { 201: { description: 'Sudden-death tiebreak session initiated' } },
      },
    },
    '/round/advance': {
      post: {
        tags: ['Rounds'],
        summary: 'Administratively trigger round advancement based strictly on database vote verification (Admin only)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AdvanceRoundRequest' } } },
        },
        responses: { 200: { description: 'Matchups evaluated and winners advanced' } },
      },
    },
    '/health': {
      get: {
        tags: ['System'],
        summary: 'API health and database connectivity check',
        responses: { 200: { description: 'API is healthy' } },
      },
    },
  },
};

export const swaggerRouter = Router();
swaggerRouter.use('/', swaggerUi.serve, swaggerUi.setup(openApiSpec));

import express, { Express, Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { prisma } from './config/database.js';
import { requestLogger } from './middleware/logging.middleware.js';
import { globalRateLimiter } from './middleware/rate-limit.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { swaggerRouter } from './docs/swagger.js';
import { ApiResponse } from './utils/api-response.js';

// Import modules
import authRoutes from './modules/auth/auth.routes.js';
import contestantsRoutes from './modules/contestants/contestants.routes.js';
import tournamentsRoutes from './modules/tournaments/tournaments.routes.js';
import bracketsRoutes from './modules/brackets/brackets.routes.js';
import matchupsRoutes from './modules/matchups/matchups.routes.js';
import roastLinesRoutes from './modules/matchups/roast-lines.routes.js';
import votesRoutes from './modules/votes/votes.routes.js';
import roundsRoutes from './modules/rounds/rounds.routes.js';

export const createApp = (): Express => {
  const app = express();

  // Basic security and parsing middlewares
  app.use(helmet({
    contentSecurityPolicy: false, // Allows Swagger UI assets
  }));

  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
      credentials: true,
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(requestLogger);
  app.use(globalRateLimiter);

  // Health check endpoint
  const healthHandler = async (req: Request, res: Response) => {
    let dbStatus = 'disconnected';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'error';
    }

    ApiResponse.success(
      res,
      {
        status: 'UP',
        database: dbStatus,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
      },
      'Roast Battle Bracket API is running smoothly'
    );
  };

  // Serve static web app and dashboard
  const publicPath = path.resolve(process.cwd(), 'public');
  app.use(express.static(publicPath));
  app.get('/dashboard', (req: Request, res: Response) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });

  app.get('/health', healthHandler);
  app.get('/api/v1/health', healthHandler);

  // Swagger Documentation
  app.use('/api/docs', swaggerRouter);

  // API v1 Router
  const apiRouter = express.Router();
  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/contestants', contestantsRoutes);
  apiRouter.use('/tournaments', tournamentsRoutes);
  apiRouter.use('/bracket', bracketsRoutes);
  apiRouter.use('/matchup', matchupsRoutes);
  apiRouter.use('/roast-lines', roastLinesRoutes);
  apiRouter.use('/vote', votesRoutes);
  apiRouter.use('/round', roundsRoutes);

  // Aliases for direct endpoint paths specified in requirement tables
  apiRouter.use('/contestant', contestantsRoutes);
  apiRouter.use('/tournament', tournamentsRoutes);

  // Mount under /api/v1 and root /
  app.use('/api/v1', apiRouter);
  app.use('/', apiRouter);

  // 404 handler for undefined routes
  app.use((req: Request, res: Response) => {
    ApiResponse.error(res, `Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND');
  });

  // Centralized Error Middleware
  app.use(errorHandler);

  return app;
};

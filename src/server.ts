import 'dotenv/config';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { logger } from './config/logger.js';
import { matchupFinalizerScheduler } from './jobs/matchup-finalizer.job.js';
import { outboxWorker } from './jobs/outbox-worker.job.js';

const startServer = async () => {
  try {
    logger.info('Initializing Roast Battle Bracket API Server...');

    // Attempt connecting to database
    try {
      await connectDatabase();
    } catch (err: any) {
      logger.warn(
        { err: err.message },
        'PostgreSQL database connection failed at startup. Server will continue running, but DB-dependent endpoints require database access.'
      );
    }

    const app = createApp();

    const server = app.listen(env.PORT, () => {
      logger.info(`🔥 Server is running on port ${env.PORT} in [${env.NODE_ENV}] mode`);
      logger.info(`📚 Swagger OpenAPI documentation available at: http://localhost:${env.PORT}/api/docs`);
      logger.info(`🩺 Health check endpoint: http://localhost:${env.PORT}/health`);

      // Start background workers
      matchupFinalizerScheduler.start();
      outboxWorker.start();
    });

    // Graceful Shutdown handling
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      matchupFinalizerScheduler.stop();
      outboxWorker.stop();

      server.close(async () => {
        logger.info('HTTP server closed');
        await disconnectDatabase();
        logger.info('Graceful shutdown completed');
        process.exit(0);
      });

      // Force exit if not shut down within 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.fatal({ error }, 'Fatal error during server startup');
    process.exit(1);
  }
};

startServer();

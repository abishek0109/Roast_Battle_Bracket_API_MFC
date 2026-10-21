import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { emailService } from './email.service.js';
import { logger } from '../../config/logger.js';

export interface EnqueueNotificationParams {
  type: 'ROUND_ADVANCEMENT' | 'TOURNAMENT_CHAMPION' | 'MATCHUP_READY';
  recipientEmail: string;
  subject: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export class NotificationService {
  /**
   * Enqueues an email notification into the transactional outbox table.
   * Can accept a Prisma transaction client so the outbox record is atomically committed
   * with the matchup advancement.
   */
  public async queueNotification(
    params: EnqueueNotificationParams,
    tx: Prisma.TransactionClient = prisma
  ): Promise<void> {
    await tx.notificationOutbox.create({
      data: {
        type: params.type,
        recipientEmail: params.recipientEmail,
        subject: params.subject,
        body: params.body,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        status: 'PENDING',
        attempts: 0,
      },
    });

    logger.debug(
      { recipient: params.recipientEmail, type: params.type, subject: params.subject },
      'Enqueued notification into outbox'
    );
  }

  /**
   * Processes pending notifications from the transactional outbox.
   * Ensures transient failures are recorded, retried up to MAX_ATTEMPTS,
   * and duplicate sends are avoided.
   */
  public async processOutbox(batchSize = 10): Promise<{ processed: number; failed: number }> {
    const pendingNotifications = await prisma.notificationOutbox.findMany({
      where: {
        status: 'PENDING',
        attempts: { lt: 5 },
      },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
    });

    let processed = 0;
    let failed = 0;

    for (const item of pendingNotifications) {
      try {
        await emailService.sendEmail({
          to: item.recipientEmail,
          subject: item.subject,
          text: item.body,
        });

        await prisma.notificationOutbox.update({
          where: { id: item.id },
          data: {
            status: 'SENT',
            processedAt: new Date(),
          },
        });

        processed++;
      } catch (error: any) {
        failed++;
        const nextAttempts = item.attempts + 1;
        const status = nextAttempts >= 5 ? 'FAILED' : 'PENDING';

        await prisma.notificationOutbox.update({
          where: { id: item.id },
          data: {
            attempts: nextAttempts,
            status,
            lastError: error.message || 'Unknown error occurred',
          },
        });

        logger.error(
          { id: item.id, attempts: nextAttempts, error: error.message },
          'Notification dispatch attempt failed'
        );
      }
    }

    return { processed, failed };
  }
}

export const notificationService = new NotificationService();

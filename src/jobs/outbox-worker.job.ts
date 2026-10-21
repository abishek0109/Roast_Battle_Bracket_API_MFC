import { notificationService } from '../modules/notifications/notification.service.js';
import { logger } from '../config/logger.js';

export class OutboxWorker {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  public start(intervalMs = 5000): void {
    if (this.timer) return;

    logger.info({ intervalMs }, 'Starting Notification Outbox Worker');

    this.timer = setInterval(() => {
      this.pollOutbox().catch((err) => {
        logger.error({ err }, 'Error in outbox worker cycle');
      });
    }, intervalMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('Notification Outbox Worker stopped');
    }
  }

  public async pollOutbox(): Promise<{ processed: number; failed: number }> {
    if (this.isProcessing) return { processed: 0, failed: 0 };

    this.isProcessing = true;
    try {
      return await notificationService.processOutbox(15);
    } catch (error: any) {
      logger.debug({ error: error.message }, 'Outbox cycle encountered exception');
      return { processed: 0, failed: 0 };
    } finally {
      this.isProcessing = false;
    }
  }
}

export const outboxWorker = new OutboxWorker();

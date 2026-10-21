import { describe, it, expect } from 'vitest';
import { emailService } from '../../src/modules/notifications/email.service.js';

describe('Notification & Email Unit Tests', () => {
  it('dispatches emails in development preview mode without throwing', async () => {
    const result = await emailService.sendEmail({
      to: 'winner@example.com',
      subject: 'You Advanced to Round 2!',
      text: 'Congratulations, you won your matchup.',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.preview).toContain('preview mode');
  });
});

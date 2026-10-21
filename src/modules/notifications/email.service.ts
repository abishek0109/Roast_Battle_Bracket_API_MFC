import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isDevelopmentMode: boolean;

  constructor() {
    this.isDevelopmentMode = !env.SMTP_HOST || env.NODE_ENV === 'test' || env.NODE_ENV === 'development';
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    if (env.SMTP_HOST && env.SMTP_HOST.trim().length > 0) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: env.SMTP_USER
          ? {
              user: env.SMTP_USER,
              pass: env.SMTP_PASS,
            }
          : undefined,
      });
      logger.info({ host: env.SMTP_HOST, port: env.SMTP_PORT }, 'Email SMTP transporter configured');
    } else {
      logger.info('No external SMTP configured. Running EmailService in local preview / mock mode');
    }
  }

  public async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; preview?: string }> {
    if (this.isDevelopmentMode && !this.transporter) {
      logger.info(
        {
          to: options.to,
          subject: options.subject,
          previewText: options.text.substring(0, 100),
        },
        '📨 [EMAIL PREVIEW (MOCK)] Email dispatched successfully in development mode'
      );
      return {
        success: true,
        messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        preview: 'Email logged in development/test preview mode',
      };
    }

    if (!this.transporter) {
      logger.warn('Email transporter not available, skipping email send');
      return { success: false };
    }

    try {
      const info = await this.transporter.sendMail({
        from: env.EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      logger.info({ to: options.to, messageId: info.messageId }, 'Email successfully sent via SMTP');
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error: any) {
      logger.error({ error: error.message, to: options.to, subject: options.subject }, 'Failed to send email via SMTP');
      throw error;
    }
  }
}

export const emailService = new EmailService();

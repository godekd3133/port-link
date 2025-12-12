import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Transporter } from 'nodemailer';

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  context?: Record<string, any>;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly from: string;
  private readonly enabled: boolean;

  constructor(
    @Inject('MAIL_TRANSPORTER') private readonly transporter: Transporter,
    private readonly configService: ConfigService,
  ) {
    this.from = configService.get('EMAIL_FROM') || 'noreply@portlink.com';
    this.enabled = !!(configService.get('SMTP_USER') && configService.get('SMTP_PASSWORD'));
  }

  /**
   * Send an email
   */
  async send(options: SendMailOptions): Promise<boolean> {
    if (!this.enabled) {
      this.logger.warn('Mail service not configured, skipping email send');
      return false;
    }

    try {
      const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to;

      const mailOptions = {
        from: this.from,
        to: recipients,
        subject: options.subject,
        text: options.text,
        html: options.html || this.generateHtml(options),
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent to ${recipients}: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      return false;
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcome(email: string, name: string): Promise<boolean> {
    return this.send({
      to: email,
      subject: 'Welcome to PortLink! 🚀',
      html: this.templates.welcome(name),
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email: string, name: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${this.configService.get('FRONTEND_URL') || 'http://localhost:3001'}/reset-password?token=${resetToken}`;

    return this.send({
      to: email,
      subject: 'Reset Your Password - PortLink',
      html: this.templates.passwordReset(name, resetUrl),
    });
  }

  /**
   * Send email verification
   */
  async sendVerification(email: string, name: string, verifyToken: string): Promise<boolean> {
    const verifyUrl = `${this.configService.get('FRONTEND_URL') || 'http://localhost:3001'}/verify-email?token=${verifyToken}`;

    return this.send({
      to: email,
      subject: 'Verify Your Email - PortLink',
      html: this.templates.emailVerification(name, verifyUrl),
    });
  }

  /**
   * Send notification email (like, comment, bookmark)
   */
  async sendNotification(
    email: string,
    name: string,
    type: 'like' | 'comment' | 'bookmark' | 'report',
    details: { postTitle: string; actorName: string; content?: string },
  ): Promise<boolean> {
    const subjects = {
      like: `${details.actorName} liked your post "${details.postTitle}"`,
      comment: `${details.actorName} commented on "${details.postTitle}"`,
      bookmark: `${details.actorName} bookmarked your post "${details.postTitle}"`,
      report: `Your report has been reviewed - "${details.postTitle}"`,
    };

    return this.send({
      to: email,
      subject: subjects[type],
      html: this.templates.notification(name, type, details),
    });
  }

  /**
   * Generate HTML from template and context
   */
  private generateHtml(options: SendMailOptions): string {
    if (options.html) return options.html;
    if (options.text) return `<p>${options.text}</p>`;
    return '';
  }

  /**
   * Email templates
   */
  private templates = {
    welcome: (name: string) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
          .content { padding: 30px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; }
          .footer { text-align: center; padding: 20px 0; color: #666; font-size: 14px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 Welcome to PortLink!</h1>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>Welcome to PortLink! We're excited to have you join our developer community.</p>
            <p>Here's what you can do:</p>
            <ul>
              <li>📝 Share your portfolio projects</li>
              <li>💡 Discover inspiring work from other developers</li>
              <li>🤝 Connect and engage with the community</li>
              <li>📊 Track your content performance</li>
            </ul>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${this.configService.get('FRONTEND_URL') || 'http://localhost:3001'}" class="button">Get Started</a>
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} PortLink. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,

    passwordReset: (name: string, resetUrl: string) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
          .content { padding: 30px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; }
          .footer { text-align: center; padding: 20px 0; color: #666; font-size: 14px; border-top: 1px solid #eee; }
          .warning { background: #fef3c7; padding: 10px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset</h1>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <div class="warning">
              <strong>⚠️ This link expires in 1 hour.</strong><br>
              If you didn't request this, please ignore this email.
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} PortLink. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,

    emailVerification: (name: string, verifyUrl: string) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
          .content { padding: 30px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; }
          .footer { text-align: center; padding: 20px 0; color: #666; font-size: 14px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✉️ Verify Your Email</h1>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>Please verify your email address by clicking the button below:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" class="button">Verify Email</a>
            </p>
            <p>This helps us ensure the security of your account.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} PortLink. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,

    notification: (
      name: string,
      type: 'like' | 'comment' | 'bookmark' | 'report',
      details: { postTitle: string; actorName: string; content?: string },
    ) => {
      const icons = { like: '❤️', comment: '💬', bookmark: '🔖', report: '📋' };
      const messages = {
        like: `<strong>${details.actorName}</strong> liked your post`,
        comment: `<strong>${details.actorName}</strong> commented on your post`,
        bookmark: `<strong>${details.actorName}</strong> bookmarked your post`,
        report: `Your report has been reviewed`,
      };

      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
            .content { padding: 30px 0; }
            .post-card { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; }
            .footer { text-align: center; padding: 20px 0; color: #666; font-size: 14px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${icons[type]} New Notification</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>${messages[type]}:</p>
              <div class="post-card">
                <strong>${details.postTitle}</strong>
                ${details.content ? `<p style="margin-top: 10px; color: #666;">"${details.content}"</p>` : ''}
              </div>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${this.configService.get('FRONTEND_URL') || 'http://localhost:3001'}" class="button">View on PortLink</a>
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} PortLink. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    },
  };
}

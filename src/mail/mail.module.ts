import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

@Global()
@Module({
  providers: [
    MailService,
    {
      provide: 'MAIL_TRANSPORTER',
      useFactory: async (configService: ConfigService) => {
        const nodemailer = await import('nodemailer');

        const transporter = nodemailer.createTransport({
          host: configService.get('SMTP_HOST') || 'smtp.gmail.com',
          port: parseInt(configService.get('SMTP_PORT') || '587', 10),
          secure: configService.get('SMTP_PORT') === '465',
          auth: {
            user: configService.get('SMTP_USER'),
            pass: configService.get('SMTP_PASSWORD'),
          },
        });

        // Verify connection in development
        if (configService.get('NODE_ENV') === 'development') {
          try {
            await transporter.verify();
            console.log('📧 Mail transporter connected');
          } catch (error) {
            console.warn('📧 Mail transporter not configured (optional):', error.message);
          }
        }

        return transporter;
      },
      inject: [ConfigService],
    },
  ],
  exports: [MailService],
})
export class MailModule {}

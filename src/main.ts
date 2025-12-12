import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';
import multipart from '@fastify/multipart';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: false, // Use pino logger instead
      trustProxy: true, // Trust X-Forwarded-* headers
    }),
    { bufferLogs: true },
  );

  // Register Fastify plugins
  await app.register(helmet, {
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
  });
  await app.register(compress, { encodings: ['gzip', 'deflate'] });
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max file size
      files: 5, // Max 5 files at once
    },
  });

  // Global prefix
  const apiPrefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // API Versioning disabled - using global prefix for versioning
  // app.enableVersioning({
  //   type: VersioningType.URI,
  //   defaultVersion: '1',
  //   prefix: false,
  // });

  // Logger
  app.useLogger(app.get(Logger));

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS
  const corsOrigins = process.env.CORS_ORIGIN?.split(',') || ['*'];
  app.enableCors({
    origin: corsOrigins.length === 1 && corsOrigins[0] === '*' ? '*' : corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
  });

  // Swagger Documentation
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
    const config = new DocumentBuilder()
      .setTitle('PortLink API')
      .setDescription(
        `## Developer Portfolio & Community Platform API

### Overview
PortLink is a platform where developers can share their portfolio projects,
connect with other developers, and grow their professional network.

### Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
\`\`\`
Authorization: Bearer <your-token>
\`\`\`

### Rate Limiting
- Short: 3 requests per second
- Medium: 20 requests per 10 seconds
- Long: 100 requests per minute

### Error Responses
All errors follow this format:
\`\`\`json
{
  "success": false,
  "statusCode": 400,
  "message": "Error message",
  "errors": ["field1 is required", "field2 must be valid"]
}
\`\`\`
      `,
      )
      .setVersion('1.0.0')
      .setContact('PortLink Team', 'https://portlink.dev', 'support@portlink.dev')
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
        'JWT-auth',
      )
      .addServer(`http://localhost:${process.env.PORT || 3000}`, 'Local Development')
      .addServer('https://api.portlink.dev', 'Production')
      .addTag('auth', 'Authentication & Authorization')
      .addTag('users', 'User Management')
      .addTag('profiles', 'User Profiles')
      .addTag('posts', 'Post Management')
      .addTag('comments', 'Comments')
      .addTag('likes', 'Likes')
      .addTag('bookmarks', 'Bookmarks')
      .addTag('notifications', 'Notifications')
      .addTag('feed', 'Feed & Discovery')
      .addTag('dashboard', 'Dashboard & Analytics')
      .addTag('admin', 'Admin Operations')
      .addTag('upload', 'File Upload')
      .addTag('reports', 'Content Reports')
      .addTag('health', 'Health Checks')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
      },
      customSiteTitle: 'PortLink API Documentation',
    });
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';

  await app.listen(port, host);

  const logger = app.get(Logger);
  logger.log(`🚀 Application is running on: http://${host}:${port}`);
  logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  logger.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});

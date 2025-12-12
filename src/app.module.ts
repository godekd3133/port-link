import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { DatabaseModule } from './database/database.module';
import { CacheModule } from './cache/cache.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProfilesModule } from './profiles/profiles.module';
import { PostsModule } from './posts/posts.module';
import { CommentsModule } from './comments/comments.module';
import { LikesModule } from './likes/likes.module';
import { BookmarksModule } from './bookmarks/bookmarks.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FeedModule } from './feed/feed.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AdminModule } from './admin/admin.module';
import { UploadModule } from './upload/upload.module';
import { ReportsModule } from './reports/reports.module';
import { WebSocketModule } from './websocket/websocket.module';
import { FollowsModule } from './follows/follows.module';
import { MentionsModule } from './mentions/mentions.module';
import { AiModule } from './ai/ai.module';
import { CollaborationsModule } from './collaborations/collaborations.module';
import { PortfolioCoachModule } from './portfolio-coach/portfolio-coach.module';
import { EndorsementsModule } from './endorsements/endorsements.module';
import { MatchingModule } from './matching/matching.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { GitHubModule } from './github/github.module';
import { InsightsModule } from './insights/insights.module';
import { HealthController } from './health.controller';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Logging
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV === 'development'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  translateTime: 'SYS:standard',
                  ignore: 'pid,hostname',
                },
              }
            : undefined,
        level: process.env.LOG_LEVEL || 'info',
        autoLogging: process.env.NODE_ENV !== 'test',
      },
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
      },
    ]),

    // Core Infrastructure
    DatabaseModule,
    CacheModule,
    MailModule,

    // Feature Modules
    AuthModule,
    UsersModule,
    ProfilesModule,
    PostsModule,
    CommentsModule,
    LikesModule,
    BookmarksModule,
    NotificationsModule,
    FeedModule,
    DashboardModule,
    AdminModule,
    UploadModule,
    ReportsModule,
    WebSocketModule,
    FollowsModule,
    MentionsModule,
    AiModule,
    CollaborationsModule,
    PortfolioCoachModule,
    EndorsementsModule,
    MatchingModule,
    AnalyticsModule,
    GitHubModule,
    InsightsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Global Rate Limiting Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global Exception Filter
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // Global Response Transformer
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // Global Timeout (30 seconds)
    {
      provide: APP_INTERCEPTOR,
      useFactory: () => new TimeoutInterceptor(30000),
    },
  ],
})
export class AppModule {}

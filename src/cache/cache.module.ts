import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';

@Global()
@Module({
  providers: [
    CacheService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const { createClient } = await import('redis');
        const client = createClient({
          socket: {
            host: configService.get('REDIS_HOST') || 'localhost',
            port: parseInt(configService.get('REDIS_PORT') || '6379', 10),
          },
          password: configService.get('REDIS_PASSWORD') || undefined,
        });

        client.on('error', (err) => console.error('Redis Client Error', err));
        client.on('connect', () => console.log('🔴 Redis connected'));

        await client.connect();
        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: [CacheService, 'REDIS_CLIENT'],
})
export class CacheModule {}

import { Controller, Get, Inject, Optional } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from './database/prisma.service';
import { SkipThrottle } from '@nestjs/throttler';
import type { RedisClientType } from 'redis';

interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: { status: 'ok' | 'down'; latency?: number };
    redis: { status: 'ok' | 'down' | 'not_configured'; latency?: number };
  };
}

@ApiTags('health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject('REDIS_CLIENT') private readonly redis?: RedisClientType,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check with dependency status' })
  @ApiResponse({ status: 200, description: 'Detailed health information' })
  async detailedCheck(): Promise<HealthStatus> {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
    };

    const allOk = Object.values(checks).every(
      (check) => check.status === 'ok' || check.status === 'not_configured',
    );
    const anyDown = Object.values(checks).some((check) => check.status === 'down');

    return {
      status: anyDown ? 'down' : allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      checks,
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is ready to accept traffic' })
  async readiness() {
    const dbCheck = await this.checkDatabase();
    if (dbCheck.status === 'down') {
      return { ready: false, reason: 'Database connection failed' };
    }
    return { ready: true };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  liveness() {
    return { alive: true, timestamp: new Date().toISOString() };
  }

  private async checkDatabase(): Promise<{ status: 'ok' | 'down'; latency?: number }> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', latency: Date.now() - start };
    } catch {
      return { status: 'down' };
    }
  }

  private async checkRedis(): Promise<{
    status: 'ok' | 'down' | 'not_configured';
    latency?: number;
  }> {
    if (!this.redis) {
      return { status: 'not_configured' };
    }

    const start = Date.now();
    try {
      await this.redis.ping();
      return { status: 'ok', latency: Date.now() - start };
    } catch {
      return { status: 'down' };
    }
  }
}

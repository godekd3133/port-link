import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import type { RedisClientType } from 'redis';

@Injectable()
export class CacheService implements OnModuleDestroy {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: RedisClientType) {}

  async onModuleDestroy() {
    await this.redis.quit();
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  }

  /**
   * Set a value in cache with optional TTL (in seconds)
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds) {
      await this.redis.setEx(key, ttlSeconds, serialized);
    } else {
      await this.redis.set(key, serialized);
    }
  }

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async delPattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(keys);
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  /**
   * Get remaining TTL of a key (in seconds)
   */
  async ttl(key: string): Promise<number> {
    return this.redis.ttl(key);
  }

  /**
   * Increment a numeric value
   */
  async incr(key: string): Promise<number> {
    return this.redis.incr(key);
  }

  /**
   * Increment by a specific amount
   */
  async incrBy(key: string, amount: number): Promise<number> {
    return this.redis.incrBy(key, amount);
  }

  /**
   * Add to a sorted set (useful for leaderboards, rate limiting)
   */
  async zAdd(key: string, score: number, member: string): Promise<void> {
    await this.redis.zAdd(key, { score, value: member });
  }

  /**
   * Get top N from sorted set (descending)
   */
  async zTopN(key: string, n: number): Promise<Array<{ value: string; score: number }>> {
    return this.redis.zRangeWithScores(key, 0, n - 1, { REV: true });
  }

  /**
   * Cache wrapper - get from cache or execute function and cache result
   */
  async wrap<T>(key: string, fn: () => Promise<T>, ttlSeconds: number = 300): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const result = await fn();
    await this.set(key, result, ttlSeconds);
    return result;
  }

  /**
   * Hash operations for structured data
   */
  async hSet(key: string, field: string, value: any): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    await this.redis.hSet(key, field, serialized);
  }

  async hGet<T>(key: string, field: string): Promise<T | null> {
    const data = await this.redis.hGet(key, field);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  }

  async hGetAll<T>(key: string): Promise<Record<string, T>> {
    const data = await this.redis.hGetAll(key);
    const result: Record<string, T> = {};
    for (const [field, value] of Object.entries(data)) {
      try {
        result[field] = JSON.parse(value) as T;
      } catch {
        result[field] = value as unknown as T;
      }
    }
    return result;
  }

  async hDel(key: string, field: string): Promise<void> {
    await this.redis.hDel(key, field);
  }

  /**
   * List operations (for queues, recent items)
   */
  async lPush(key: string, value: any): Promise<number> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    return this.redis.lPush(key, serialized);
  }

  async lRange<T>(key: string, start: number, stop: number): Promise<T[]> {
    const data = await this.redis.lRange(key, start, stop);
    return data.map((item) => {
      try {
        return JSON.parse(item) as T;
      } catch {
        return item as unknown as T;
      }
    });
  }

  async lTrim(key: string, start: number, stop: number): Promise<void> {
    await this.redis.lTrim(key, start, stop);
  }

  /**
   * Set operations (for unique collections)
   */
  async sAdd(key: string, ...members: string[]): Promise<number> {
    return this.redis.sAdd(key, members);
  }

  async sMembers(key: string): Promise<string[]> {
    return this.redis.sMembers(key);
  }

  async sIsMember(key: string, member: string): Promise<boolean> {
    return this.redis.sIsMember(key, member);
  }

  async sRem(key: string, member: string): Promise<number> {
    return this.redis.sRem(key, member);
  }

  /**
   * Pub/Sub for real-time features
   */
  async publish(channel: string, message: any): Promise<number> {
    const serialized = typeof message === 'string' ? message : JSON.stringify(message);
    return this.redis.publish(channel, serialized);
  }
}

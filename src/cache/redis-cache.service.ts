import { Injectable, Logger } from '@nestjs/common';

import { RedisService } from 'nestjs-redis';

@Injectable()
export class RedisCacheService {
  private readonly logger: Logger;
  private _client;

  public get client() {
    return this._client;
  }

  public async recordExists(key: string): Promise<boolean> {
    return !!(await this.client.exists(key));
  }

  public async getRecord(key: string): Promise<any | null> {
    try {
      return await this.client.get(key);
    } catch (err) {
      // this.logger.error(err);
      return Promise.resolve(null);
    }
  }

  public async setRecord<T>(key: string, value: T, ttl = 60): Promise<boolean> {
    try {
      await this.client.set(key, value, 'EX', ttl);
      return Promise.resolve(true);
    } catch (err) {
      this.logger.error('error in setRecord');
      return Promise.reject('Error while setting the record in redis database');
    }
  }

  public async setHash<T extends object>(
    key: string,
    value: T,
    ttl = 60,
  ): Promise<boolean> {
    const flattenedValue = Object.entries(value).reduce(
      (acc, curr) => acc.concat(curr),
      [],
    );
    try {
      await this.client.hmset(key, flattenedValue);
      await this.client.expire(key, ttl);
      return Promise.resolve(true);
    } catch (err) {
      this.logger.error('error in setHash');
      return Promise.reject('Error while setting the record in redis database');
    }
  }

  public async getHash<T extends object>(key: string): Promise<T | null> {
    try {
      return await this.client.hgetall(key);
    } catch (err) {
      this.logger.error('error in getHash');
      this.logger.error(err);
      return Promise.resolve(null);
    }
  }

  constructor(private readonly redis: RedisService) {
    this.logger = new Logger('RedisCacheService');
    this.initReditClient();
  }

  private async getClient(): Promise<any> {
    try {
      return await this.redis.getClient();
    } catch (err) {
      this.logger.error(err);
    }
  }

  private async initReditClient() {
    this._client = await this.getClient();
    this.logger.log('redis client initialized');
  }
}

import { Injectable, Logger } from '@nestjs/common';

import { Stream } from 'stream';
import { from, Observable, of } from 'rxjs';
import { map, catchError, mapTo, tap } from 'rxjs/operators';
import { RedisService } from 'nestjs-redis';
import * as redisRStream from 'redis-rstream';

@Injectable()
export class RedisCacheService {
  private readonly logger: Logger;
  private redisClient;

  public get client() {
    return this.redisClient;
  }

  constructor(private readonly redis: RedisService) {
    this.logger = new Logger('RedisCacheService');
    this.initReditClient();
  }

  public recordExists(key: string): Observable<boolean> {
    return from(this.client.exists(key) as Promise<boolean>).pipe(map(Boolean));
  }

  public getRecord(
    key: string,
    resetTtl: boolean = true,
    ttl = 60,
  ): Observable<any | null> {
    return from(this.client.get(key) as Promise<any>).pipe(
      map(record => (!!record ? record : null)),
      tap(record =>
        !!record && resetTtl ? this.client.expire(key, ttl) : undefined,
      ),
      catchError(err => {
        this.logger.error('error in getRecord');
        this.logger.debug(err);
        return of(null);
      }),
    );
  }

  public getRecordAsStream(key: string): Stream {
    return redisRStream(this.client, key);
  }

  public getHash<T extends object>(key: string): Observable<T | null> {
    return from(this.client.hgetall(key)).pipe(
      map(record => (!!record ? record : null)),
      catchError(err => {
        this.logger.error('error in getHash');
        this.logger.debug(err);
        return of(null);
      }),
    );
  }

  public setRecord<T>(key: string, value: T, ttl = 60): Observable<boolean> {
    return from(this.client.set(key, value, 'EX', ttl)).pipe(
      mapTo(true),
      catchError(err => {
        this.logger.error('error in setRecord');
        this.logger.debug(err);
        return of(false);
      }),
    );
  }

  public setHash<T extends object>(
    key: string,
    value: T,
    ttl: number = null,
  ): Observable<boolean> {
    const flattenedValue = Object.entries(value).reduce(
      (acc, curr) => acc.concat(curr),
      [],
    );
    return from(this.client.hmset(key, flattenedValue)).pipe(
      tap(() => (ttl !== null ? this.client.expire(key, ttl) : undefined)),
      mapTo(true),
      catchError(err => {
        this.logger.error('error in setHash');
        this.logger.debug(err);
        return of(false);
      }),
    );
  }

  private async getClient(): Promise<any> {
    try {
      return await this.redis.getClient();
    } catch (err) {
      this.logger.error(err);
    }
  }

  private async initReditClient() {
    this.redisClient = await this.getClient();
    this.logger.log('redis client initialized');
  }
}

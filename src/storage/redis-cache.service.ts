import { Injectable, Logger } from '@nestjs/common';

import { RedisStorageService } from './redis-storage.service';
import { Observable, of, from } from 'rxjs';
import { tap, catchError, mapTo } from 'rxjs/operators';

@Injectable()
export class RedisCacheService {
  private readonly logger: Logger;

  constructor(private readonly storage: RedisStorageService) {}

  public isRecordInCache(key: string): Observable<boolean> {
    return this.storage.recordExists(key);
  }

  public getRecordFromCache(
    key: string,
    resetTtl: boolean = true,
    ttl = 60,
  ): Observable<any | null> {
    return this.storage.getRecord(key).pipe(
      tap(record =>
        !!record && resetTtl ? this.storage.client.expire(key, ttl) : undefined,
      ),
      catchError(err => {
        this.logger.error('error in getRecordFromCache');
        this.logger.debug(err);
        return of(null);
      }),
    );
  }

  public getHashFromCache(key: string, resetTtl: boolean = true, ttl = 60) {
    this.storage.getHash(key).pipe(
      tap(record =>
        !!record && resetTtl ? this.storage.client.expire(key, ttl) : undefined,
      ),
      catchError(err => {
        this.logger.error('error in getHashFromCache');
        this.logger.debug(err);
        return of(null);
      }),
    );
  }

  public setRecordInCache<T>(
    key: string,
    value: T,
    ttl = 60,
  ): Observable<boolean> {
    return from(this.storage.client.set(key, value, 'EX', ttl)).pipe(
      mapTo(true),
      catchError(err => {
        this.logger.error('error in setRecordInCache');
        this.logger.debug(err);
        return of(false);
      }),
    );
  }

  public setHashInCache<T extends object>(
    key: string,
    value: T,
    ttl: number = null,
  ): Observable<boolean> {
    return this.storage.setHash(key, value).pipe(
      tap(() =>
        ttl !== null ? this.storage.client.expire(key, ttl) : undefined,
      ),
      catchError(err => {
        this.logger.error('error in setHashInCache');
        this.logger.debug(err);
        return of(false);
      }),
    );
  }
}

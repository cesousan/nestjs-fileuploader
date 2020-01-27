import { from, Observable } from 'rxjs';
import { RedisService } from 'nestjs-redis';

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RedisCacheService {
  private readonly logger: Logger;
  private _client$: Observable<any>;

  public get client$() {
    return !this._client$
      ? (this._client$ = from(this.getClient()))
      : this._client$;
  }

  constructor(private readonly redis: RedisService) {
    this.logger = new Logger('RedisCacheService');
  }

  private async getClient(): Promise<any> {
    try {
      return await this.redis.getClient();
    } catch (err) {
      this.logger.error(err);
    }
  }
}

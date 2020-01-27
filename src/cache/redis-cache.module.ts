import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RedisModule } from 'nestjs-redis';

@Module({
  imports: [
    RedisModule.forRootAsync({
      useFactory: (configService: ConfigService) =>
        configService.get('redisConnection'),
      inject: [ConfigService]
    })
  ]
})
export class RedisCacheModule {}

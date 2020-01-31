import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RedisModule } from 'nestjs-redis';
import { MinioModule } from 'nestjs-minio-client';

import { RedisStorageService } from './redis-storage.service';
import { RedisCacheService } from './redis-cache.service';
import { MinioStorageService } from './minio-storage.service';
import minioConfig from '../config/minio.config';

const minioClientConfig = minioConfig().minioClient;

@Module({
  imports: [
    RedisModule.forRootAsync({
      useFactory: (configService: ConfigService) =>
        configService.get('redisConnection')(true),
      inject: [ConfigService],
    }),
    MinioModule.register(minioClientConfig),
  ],
  exports: [RedisStorageService, RedisCacheService, MinioStorageService],
  providers: [RedisStorageService, RedisCacheService, MinioStorageService],
})
export class StorageModule {}

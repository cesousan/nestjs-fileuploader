import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import minioConfig from './minio.config';
import redisConfig from './redis.config';
import validationSchema from './validation-schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      load: [minioConfig, redisConfig]
    })
  ],
  providers: [ConfigService],
  exports: [ConfigService]
})
export class ConfigurationModule {}

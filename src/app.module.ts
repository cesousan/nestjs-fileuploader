import { Module } from '@nestjs/common';

import { ConfigurationModule } from './config/configuration.module';
import { FileTransferModule } from './file-transfer/file-transfer.module';
import { RedisCacheModule } from './cache/redis-cache.module';

@Module({
  imports: [ConfigurationModule, FileTransferModule, RedisCacheModule],
})
export class AppModule {}

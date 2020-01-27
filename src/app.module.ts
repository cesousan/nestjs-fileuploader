import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { ConfigurationModule } from './config/configuration.module';
import { FileTransferModule } from './file-transfer/file-transfer.module';
import { RedisCacheModule } from './cache/redis-cache.module';

@Module({
  imports: [ConfigurationModule, FileTransferModule, RedisCacheModule],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}

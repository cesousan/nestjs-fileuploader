import { Module } from '@nestjs/common';

import { ConfigurationModule } from './config/configuration.module';
import { FileTransferModule } from './file-transfer/file-transfer.module';
// import { StorageModule } from './storage/storage.module';

@Module({
  imports: [ConfigurationModule, FileTransferModule],
})
export class AppModule {}

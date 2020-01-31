import { Module } from '@nestjs/common';

import { FileTransferService } from './file-transfer.service';
import { FileTransferController } from './file-transfer.controller';
import { StorageModule } from 'src/storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [FileTransferController],
  providers: [FileTransferService],
})
export class FileTransferModule {}

import { Module } from '@nestjs/common';
import { MinioModule } from 'nestjs-minio-client';

import minioConfig from '../config/minio.config';
import { FileTransferService } from './file-transfer.service';
import { FileTransferController } from './file-transfer.controller';
import { RedisCacheService } from 'src/cache/redis-cache.service';

const minioClientConfig = minioConfig().minioClient;

@Module({
  imports: [MinioModule.register(minioClientConfig)],
  controllers: [FileTransferController],
  providers: [FileTransferService, RedisCacheService]
})
export class FileTransferModule {}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MinioService } from 'nestjs-minio-client';
import { RedisCacheService } from 'src/cache/redis-cache.service';

@Injectable()
export class FileTransferService {
  private readonly logger: Logger;
  private readonly baseBucket: string;
  constructor(
    private readonly minio: MinioService,
    private readonly config: ConfigService,
    private readonly redis: RedisCacheService
  ) {
    this.logger = new Logger('FileTransferService');
    this.baseBucket = this.config.get('baseBucket');
  }

  async listAllBuckets() {
    return this.minio.client.listBuckets();
  }

  async uploadFile(fileName, filePath, metaData = {}) {
    try {
      await this.checkBucket(this.baseBucket, true);

      const etag = await this.minio.client.fPutObject(
        this.baseBucket,
        fileName,
        filePath,
        metaData
      );

      this.redis.client$.subscribe(console.log);

      if (!etag) {
        throw new Error();
      }
      return etag;
    } catch (err) {
      this.logger.error(err);
      throw new Error('an error happened while uploading the file');
    }
  }

  private async checkBucket(bucket: string, makeBucket = false) {
    try {
      const bucketExists: boolean = await this.minio.client.bucketExists(
        bucket
      );
      if (!bucketExists) {
        if (makeBucket) {
          await this.minio.client.makeBucket(bucket);
        } else {
          throw new Error('the required bucket does not exist');
        }
      }
    } catch (err) {
      this.logger.error(err);
    }
  }
}

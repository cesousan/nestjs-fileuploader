import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MinioService } from 'nestjs-minio-client';

import { RedisCacheService } from 'src/cache/redis-cache.service';
import { rk, rCachedImgsKey } from 'src/cache/redis-keys';
import { getHashedFileName, getOriginalFileMetadata } from 'src/utils';
import {
  BufferedFile,
  StoredFile,
  StoredFileMetadata,
} from 'src/models/file.model';

@Injectable()
export class FileTransferService {
  private readonly logger: Logger;
  private readonly baseBucket: string;
  constructor(
    private readonly minio: MinioService,
    private readonly config: ConfigService,
    private readonly cache: RedisCacheService,
  ) {
    this.logger = new Logger('FileTransferService');
    this.baseBucket = this.config.get('baseBucket');
  }

  async listAllBuckets() {
    return this.minio.client.listBuckets();
  }

  async uploadFile(
    file: BufferedFile,
    destination: string,
  ): Promise<StoredFile> {
    try {
      const hashedFileName = getHashedFileName(file);
      const fileCachedKey = rk(rCachedImgsKey, hashedFileName);
      const cachedFile = await this.getFileFromCache(file, fileCachedKey);
      if (cachedFile) {
        this.logger.log(`serving ${file.originalname} DIRECTLY from cache`);
        return cachedFile;
      } else {
        // minio upload
        const minioUpload: Promise<boolean> = this.uploadToMinio(
          this.baseBucket,
          destination,
          hashedFileName,
          file,
        );

        // redis caching
        const fileToCache = {
          id: hashedFileName,
          file: file.buffer,
          ...getOriginalFileMetadata(file),
        };
        const cacheFile: Promise<boolean> = this.setFileInCache(
          fileToCache,
          fileCachedKey,
        );

        // outcomes
        const operations: boolean[] = await Promise.all([
          minioUpload,
          cacheFile,
        ]);

        if (operations.every(x => !!x)) {
          const fileFromCache = await this.getFileFromCache(
            file,
            fileCachedKey,
          );
          this.logger.log(
            `serving ${file.originalname} from cache after successfully uploading to minio`,
          );
          return fileFromCache;
        }
      }
    } catch (err) {
      this.logger.error(err);
    }
  }

  async setFileInCache(file: StoredFile, fileKey?: string): Promise<boolean> {
    const key = !!fileKey
      ? fileKey
      : rk(rCachedImgsKey, getHashedFileName(file));
    try {
      return await this.cache.setHash(key, file);
    } catch (err) {
      this.logger.error(err);
      return Promise.reject('error in setFileInCache');
    }
  }

  async getFileFromCache(
    file: any,
    fileKey?: string,
  ): Promise<StoredFile | null> {
    const key = !!fileKey
      ? fileKey
      : rk(rCachedImgsKey, getHashedFileName(file));
    try {
      if (!!(await this.cache.recordExists(key))) {
        const cachedFile = await this.cache.getHash<StoredFile>(key);

        const convertedFile = {
          ...cachedFile,
          file: Buffer.from(cachedFile.file as string, 'base64'),
        };

        return convertedFile;
      } else {
        return Promise.resolve(null);
      }
    } catch (err) {
      this.logger.error(err);
      return Promise.reject('error in getFileFromCache');
    }
  }

  private async checkBucket(bucket: string, makeBucket = false) {
    try {
      const bucketExists: boolean = await this.minio.client.bucketExists(
        bucket,
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

  private async uploadToMinio(
    baseBucket: string,
    destination: string,
    hashedFileName: string,
    file: any,
  ) {
    const metaData = {
      'Content-Type': 'application/octet-stream',
      'X-Amz-Meta-Testing': 1234,
    };
    const fileName: string = `${destination}/${hashedFileName}`;
    const fileBuffer = file.buffer;
    try {
      await this.checkBucket(baseBucket, true);
      const etag = await this.minio.client.putObject(
        baseBucket,
        fileName,
        fileBuffer,
        metaData,
      );
      if (!etag) {
        throw new Error('error while uploading file to minio');
      }
      return Promise.resolve(true);
    } catch (err) {
      this.logger.error(err);
      return Promise.reject('error in uploadToMinio');
    }
  }
}

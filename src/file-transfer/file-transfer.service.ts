import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Stream } from 'stream';
import { from, of, throwError, Observable, forkJoin } from 'rxjs';
import {
  switchMap,
  catchError,
  tap,
  map,
  mapTo,
  concatMap,
  mergeMap,
} from 'rxjs/operators';
import { MinioService } from 'nestjs-minio-client';

import { RedisCacheService } from 'src/cache/redis-cache.service';
import { rk, rCachedFilesKey, rKeys } from 'src/cache/redis-keys';
import { getHashedFileName, getOriginalFileMetadata } from 'src/utils';
import {
  BufferedFile,
  StoredFile,
  StoredFileMetadata,
  HasFile,
} from 'src/models/file.model';

@Injectable()
export class FileTransferService {
  private readonly logger: Logger;
  private readonly baseBucket: string;
  private readonly defaultFileEncoding = 'base64';
  constructor(
    private readonly minio: MinioService,
    private readonly config: ConfigService,
    private readonly cache: RedisCacheService,
  ) {
    this.logger = new Logger('FileTransferService');
    this.baseBucket = this.config.get('baseBucket');
  }

  async listAllBuckets(): Promise<any[]> {
    return this.minio.client.listBuckets();
  }

  uploadFile(
    file: BufferedFile,
    destination: string,
  ): Observable<StoredFileMetadata | null> {
    const hashedFileName = getHashedFileName(file.originalname);
    const fileCachedKey = rk(rCachedFilesKey, rKeys.FILE, hashedFileName);
    const fileMetadataKey = rk(rCachedFilesKey, rKeys.METADATA, hashedFileName);

    const cachedFileExists$ = this.cache.recordExists(fileCachedKey);
    const fileMetadata$ = this.retrieveFileMetadata(fileMetadataKey);

    return forkJoin(fileMetadata$, cachedFileExists$).pipe(
      mergeMap(([metadata, isInCache]) =>
        !!metadata && isInCache
          ? of(metadata)
          : this.performFullUpload(destination, file).pipe(
              mergeMap(outcome =>
                outcome ? this.retrieveFileMetadata(fileMetadataKey) : of(null),
              ),
            ),
      ),
    );
  }

  getFile(id: string, destination: string): Observable<any> {
    const fileCachedKey = rk(rCachedFilesKey, rKeys.FILE, id);
    return this.retrieveFileFromCache(fileCachedKey).pipe(
      concatMap(cachedFile => {
        if (cachedFile) {
          this.logger.log(`serving ${id} FROM CACHE`);
          return of(cachedFile);
        } else {
          this.logger.log(`serving ${id} FROM MINIO`);
          return this.downloadFromMinio(this.baseBucket, destination, id).pipe(
            tap(stream => {
              if (!!stream) {
                const buffers = [];
                stream.on('data', d => {
                  buffers.push(d);
                });
                stream.on('end', () => {
                  const file: HasFile = { file: Buffer.concat(buffers) };
                  this.setFileInCache(file as StoredFile, fileCachedKey);
                });
              }
            }),
          );
        }
      }),
    );
  }

  getFileMetada(id: string) {
    const fileMetadataKey = rk(rCachedFilesKey, rKeys.METADATA, id);
    return this.retrieveFileMetadata(fileMetadataKey);
  }

  private downloadFromMinio<T extends Stream>(
    bucket,
    destination,
    fileId,
  ): Observable<T> {
    const fileName: string = `${destination}/${fileId}`;
    return this.checkMinioBucketExists(bucket).pipe(
      switchMap(async exists =>
        !!exists
          ? await this.minio.client.getObject(bucket, fileName)
          : throwError('the requiered file does not exist on minio server'),
      ),
      catchError(err => {
        this.logger.error(`An error occured ::: ${err}`);
        return of(null);
      }),
    );
  }

  private setFileInCache(
    { name, file }: StoredFile,
    key?: string,
  ): Observable<boolean> {
    const fileKey = !!key
      ? key
      : rk(rCachedFilesKey, rKeys.FILE, getHashedFileName(name));
    return this.cache.setRecord(fileKey, file);
  }

  private storeFileMetadata(
    { file, ...fileMetadata }: StoredFile,
    key?: string,
  ): Observable<boolean> {
    const fileKey = !!key
      ? key
      : rk(rCachedFilesKey, rKeys.METADATA, fileMetadata.id);
    fileMetadata = { ...fileMetadata, updatedAt: new Date() };
    return this.cache.setHash(fileKey, fileMetadata);
  }

  private retrieveFileFromCache(fileKey: string): Observable<Stream> {
    return this.cache
      .recordExists(fileKey)
      .pipe(
        map(exists =>
          exists ? (this.cache.getRecordAsStream(fileKey) as Stream) : null,
        ),
      );
  }

  private retrieveFileMetadata(
    metadataKey: string,
  ): Observable<StoredFileMetadata> {
    return this.cache
      .recordExists(metadataKey)
      .pipe(
        mergeMap(exists =>
          !!exists
            ? this.cache.getHash<StoredFileMetadata>(metadataKey)
            : of(null),
        ),
      );
  }

  private performFullUpload(
    destination: string,
    file: BufferedFile,
  ): Observable<boolean> {
    const fileMetadata = getOriginalFileMetadata(file);
    const fileCachedKey = rk(rCachedFilesKey, rKeys.FILE, fileMetadata.id);
    const fileMetadataKey = rk(
      rCachedFilesKey,
      rKeys.METADATA,
      fileMetadata.id,
    );

    const fileToStore: StoredFile = {
      file: file.buffer,
      ...fileMetadata,
      encoding: this.defaultFileEncoding,
    };

    // minio upload
    const minioUpload$: Observable<boolean> = this.uploadToMinio(
      this.baseBucket,
      destination,
      fileMetadata.id,
      file,
    );

    // redis caching
    const cacheFile$: Observable<boolean> = this.setFileInCache(
      fileToStore,
      fileCachedKey,
    );

    // store metadata
    const storeFileMetadata$: Observable<boolean> = this.storeFileMetadata(
      fileToStore,
      fileMetadataKey,
    );

    return forkJoin([minioUpload$, cacheFile$, storeFileMetadata$]).pipe(
      map(outcomes => outcomes.every(res => res === true)),
      catchError(err => {
        this.logger.error('error in performFullUpload');
        this.logger.debug(err);
        return of(false);
      }),
    );
  }

  private checkMinioBucketExists(
    bucket: string,
    makeBucket = false,
  ): Observable<boolean> {
    return from(
      this.minio.client.bucketExists(bucket) as Promise<boolean>,
    ).pipe(
      switchMap((exists: boolean) => {
        if (!exists && makeBucket) {
          return from(this.minio.client.makeBucket(bucket)).pipe(
            map(Boolean),
            catchError(() => of(false)),
          );
        }
        return of(exists);
      }),
    );
  }

  private uploadToMinio(
    baseBucket: string,
    destination: string,
    hashedFileName: string,
    file: BufferedFile,
  ): Observable<boolean> {
    const metaData = {
      'Content-Type': file.mimetype,
      'X-Amz-Meta-Testing': 1234,
    };
    const fileName: string = `${destination}/${hashedFileName}`;
    const fileBuffer = file.buffer;
    return this.checkMinioBucketExists(baseBucket, true).pipe(
      switchMap(async exists =>
        exists
          ? await this.minio.client.putObject(
              baseBucket,
              fileName,
              fileBuffer,
              metaData,
            )
          : throwError('bucket does not exist and could not be created'),
      ),
      mapTo(true),
      catchError(err => {
        this.logger.error('error while uploading file to minio');
        this.logger.debug(err);
        return of(false);
      }),
    );
  }
}

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

import { RedisCacheService } from 'src/storage/redis-cache.service';
import { rk, rCachedFilesKey, rKeys } from 'src/storage/redis-keys';
import { getHashedFileName, getOriginalFileMetadata } from 'src/utils';
import {
  BufferedFile,
  StoredFile,
  StoredFileMetadata,
  HasFile,
} from 'src/models/file.model';
import { MinioStorageService } from 'src/storage/minio-storage.service';
import { RedisStorageService } from 'src/storage/redis-storage.service';

@Injectable()
export class FileTransferService {
  private readonly logger: Logger;
  private readonly defaultFileEncoding = 'base64';
  constructor(
    private readonly distStorage: MinioStorageService,
    private readonly cache: RedisCacheService,
    private readonly dbStorage: RedisStorageService,
  ) {
    this.logger = new Logger('FileTransferService');
  }

  uploadFile(
    file: BufferedFile,
    destination: string,
  ): Observable<StoredFileMetadata | null> {
    const hashedFileName = getHashedFileName(file.originalname);
    const fileCachedKey = rk(rCachedFilesKey, rKeys.FILE, hashedFileName);
    const fileMetadataKey = rk(rCachedFilesKey, rKeys.METADATA, hashedFileName);

    const cachedFileExists$ = this.cache.isRecordInCache(fileCachedKey);
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
    return this.getFileAsStream(fileCachedKey).pipe(
      concatMap(cachedFile =>
        !!cachedFile
          ? of(cachedFile)
          : this.distStorage
              .download(destination, id)
              .pipe(
                tap(stream =>
                  !!stream
                    ? this.setStreamInCache(fileCachedKey, stream)
                    : undefined,
                ),
              ),
      ),
    );
  }

  getFileMetadata(id: string) {
    const fileMetadataKey = rk(rCachedFilesKey, rKeys.METADATA, id);
    return this.retrieveFileMetadata(fileMetadataKey);
  }

  private setFileInCache(
    { name, file }: StoredFile,
    key?: string,
  ): Observable<boolean> {
    const fileKey = !!key
      ? key
      : rk(rCachedFilesKey, rKeys.FILE, getHashedFileName(name));
    return this.cache.setRecordInCache(fileKey, file);
  }

  private setStreamInCache(key: string, stream: Stream) {
    const buffers = [];
    stream.on('data', d => {
      buffers.push(d);
    });
    stream.on('end', () => {
      const file: HasFile = { file: Buffer.concat(buffers) };
      this.setFileInCache(file as StoredFile, key);
    });
  }

  private storeFileMetadata(
    { file, ...fileMetadata }: StoredFile,
    key?: string,
  ): Observable<boolean> {
    const fileKey = !!key
      ? key
      : rk(rCachedFilesKey, rKeys.METADATA, fileMetadata.id);
    fileMetadata = { ...fileMetadata, updatedAt: new Date() };
    return this.dbStorage.setHash(fileKey, fileMetadata);
  }

  private getFileAsStream(fileKey: string): Observable<Stream> {
    return this.cache
      .isRecordInCache(fileKey)
      .pipe(
        map(exists =>
          exists ? this.dbStorage.getRecordAsStream(fileKey) : null,
        ),
      );
  }

  private retrieveFileMetadata(
    metadataKey: string,
  ): Observable<StoredFileMetadata> {
    return this.dbStorage
      .recordExists(metadataKey)
      .pipe(
        mergeMap(exists =>
          !!exists
            ? this.dbStorage.getHash<StoredFileMetadata>(metadataKey)
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

    // upload file
    const upload$: Observable<boolean> = this.distStorage.upload(
      destination,
      fileMetadata.id,
      file,
    );

    // caching file
    const cacheFile$: Observable<boolean> = this.setFileInCache(
      fileToStore,
      fileCachedKey,
    );

    // store metadata
    const storeFileMetadata$: Observable<boolean> = this.storeFileMetadata(
      fileToStore,
      fileMetadataKey,
    );

    return forkJoin([upload$, cacheFile$, storeFileMetadata$]).pipe(
      map(outcomes => outcomes.every(res => res === true)),
      catchError(err => {
        this.logger.error('error in performFullUpload');
        this.logger.debug(err);
        return of(false);
      }),
    );
  }
}

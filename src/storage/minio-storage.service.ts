import { Injectable, Logger } from '@nestjs/common';
import { MinioService } from 'nestjs-minio-client';
import { ConfigService } from '@nestjs/config';
import { Stream } from 'stream';
import { Observable, throwError, of, from } from 'rxjs';
import { switchMap, catchError, map, mapTo } from 'rxjs/operators';
import { BufferedFile } from 'src/models/file.model';

@Injectable()
export class MinioStorageService {
  private readonly logger: Logger;
  private readonly baseBucket: string;

  public get client() {
    return this.minio.client;
  }

  constructor(
    private readonly minio: MinioService,
    private readonly config: ConfigService,
  ) {
    this.logger = new Logger('MinioStorageService');
    this.baseBucket = this.config.get('baseBucket');
  }

  public async listAllBuckets(): Promise<any[]> {
    return this.minio.client.listBuckets();
  }

  public download<T extends Stream>(
    destination,
    fileId,
    bucket = this.baseBucket,
  ): Observable<T> {
    const fileName: string = `${destination}/${fileId}`;
    return this.checkBucketExists(bucket).pipe(
      switchMap(async exists =>
        !!exists
          ? await this.client.getObject(bucket, fileName)
          : throwError('the requiered file does not exist on minio server'),
      ),
      catchError(err => {
        this.logger.error(`An error occured ::: ${err}`);
        return of(null);
      }),
    );
  }

  public upload(
    destination: string,
    hashedFileName: string,
    file: BufferedFile,
    baseBucket: string = this.baseBucket,
  ): Observable<boolean> {
    const metaData = {
      'Content-Type': file.mimetype,
      'X-Amz-Meta-Testing': 1234,
    };
    const fileName: string = `${destination}/${hashedFileName}`;
    const fileBuffer = file.buffer;
    return this.checkBucketExists(baseBucket, true).pipe(
      switchMap(async exists =>
        exists
          ? await this.client.putObject(
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

  private checkBucketExists(
    bucket: string,
    makeBucket = false,
  ): Observable<boolean> {
    return from(
      this.minio.client.bucketExists(bucket) as Promise<boolean>,
    ).pipe(
      switchMap((exists: boolean) => {
        if (!exists && makeBucket) {
          return from(this.client.makeBucket(bucket)).pipe(
            map(Boolean),
            catchError(() => of(false)),
          );
        }
        return of(exists);
      }),
    );
  }
}

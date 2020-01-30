import {
  Controller,
  Get,
  Logger,
  Post,
  UseInterceptors,
  UploadedFile,
  Param,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { Stream } from 'stream';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { memoryStorage } from 'multer';

import { BufferedFile, StoredFileMetadata } from 'src/models/file.model';
import { isStream } from 'src/utils';
import { FileTransferService } from './file-transfer.service';

@Controller({
  path: 'files',
})
export class FileTransferController {
  private readonly logger: Logger;
  constructor(private readonly fileTransfer: FileTransferService) {
    this.logger = new Logger('FileTransferController');
  }

  @Get()
  index() {
    return 'hello from file transfer controller';
  }

  @Get('bucket')
  async getAllBuckets() {
    return await this.fileTransfer.listAllBuckets();
  }

  @Post('upload/:destination')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadFile(
    @Param('destination') destination: string,
    @UploadedFile('file') file: BufferedFile,
  ): Observable<StoredFileMetadata> {
    this.logger.log(`upload of file ${file.originalname} requested`);
    return this.fileTransfer.uploadFile(file, destination);
  }

  @Get('stream/:destination/:id')
  getFile(
    @Param('destination') destination: string,
    @Param('id') id: string,
    @Res() response: Response,
  ): Observable<Response> {
    this.logger.log(`file ${id} requested`);
    return this.fileTransfer
      .getFile(id, destination)
      .pipe(
        map((stream: Stream | null) =>
          !stream && !isStream(stream)
            ? response.status(404).send('file not found')
            : stream.pipe(response),
        ),
      );
  }

  @Get('metadata/:id')
  getFileMetadata(@Param('id') id: string): Observable<StoredFileMetadata> {
    this.logger.log(`metadata of file ${id} requested`);
    return this.fileTransfer.getFileMetada(id);
  }
}

import {
  Controller,
  Get,
  Logger,
  Post,
  UseInterceptors,
  UploadedFile,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { memoryStorage } from 'multer';

import { BufferedFile } from 'src/models/file.model';
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
  async uploadFile(
    @Param('destination') destination: string,
    @UploadedFile('file') file: BufferedFile,
  ) {
    this.logger.log(`upload of file ${file.originalname} was requested`);
    return await this.fileTransfer.uploadFile(file, destination);
  }
}

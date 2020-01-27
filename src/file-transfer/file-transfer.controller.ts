import {
  Controller,
  Get,
  Logger,
  Post,
  UseInterceptors,
  UploadedFile,
  Param
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';

import { FileTransferService } from './file-transfer.service';

@Controller({
  path: 'files'
})
export class FileTransferController {
  private readonly logger: Logger;
  constructor(private readonly fileTransfer: FileTransferService) {
    this.logger = new Logger('FileTransferController');
  }

  @Get()
  index() {
    return 'hello from file transfer';
  }

  @Get('bucket')
  async getAllBuckets() {
    return await this.fileTransfer.listAllBuckets();
  }

  @Post('upload/:destination')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => setFileDestination(req, file, cb),
        filename: (req, file, cb) => setHashName(req, file, cb)
      })
    })
  )
  async uploadFile(
    @Param('destination') destination,
    @UploadedFile('file') file
  ) {
    const metaData = {
      'Content-Type': 'application/octet-stream',
      'X-Amz-Meta-Testing': 1234
      // tslint:disable-next-line: object-literal-key-quotes
      // example: 5678,
    };
    const fileName: string = `${destination}/${file.filename}`;
    const filePath = file.path;

    return await this.fileTransfer.uploadFile(fileName, filePath, metaData);
  }
}

export const setFileDestination = (req, file, cb) => {
  const dest = req.params.destination;
  return cb(null, setDestinationPath(dest));
};

export const setHashName = (req, file, cb) => {
  const hashedName = getHash(file.originalname);
  return cb(null, `${hashedName}${extname(file.originalname)}`);
};

export const setDestinationPath = (destination: string) => {
  const filePath = getFilePath(destination);
  if (!existsSync(filePath)) {
    createFilePath(filePath);
  }
  return filePath;
};

export const getFilePath = (destination: string) =>
  `${process.cwd()}/tmp_files/${!!destination ? destination : 'unknown'}`;

export const createFilePath = path => mkdirSync(path, { recursive: true });

export const getHash = (
  str: string,
  alg = 'sha1',
  digest: 'hex' | 'latin1' | 'base64' = 'hex'
) =>
  createHash(alg)
    .update(str)
    .digest(digest);

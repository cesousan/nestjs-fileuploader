import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import {
  BufferedFile,
  StoredFile,
  StoredFileMetadata,
} from 'src/models/file.model';

export const setFileDestination = (req, file, cb) => {
  const dest = req.params.destination;
  return cb(null, setDestinationPath(dest));
};

export const setHashName = (req, file, cb) => {
  const hashedName = getHash(file.originalname);
  return cb(null, getHashedFileName(file));
};

export const setDestinationPath = (destination: string) => {
  const filePath = getFilePath(destination);
  if (!existsSync(filePath)) {
    createFilePath(filePath);
  }
  return filePath;
};

export const getFilePath = (
  destination: string,
  rootDirectory = 'tmp_files',
  fallbackDestination = 'unknown',
) =>
  `${process.cwd()}/${rootDirectory}/${
    !!destination ? destination : fallbackDestination
  }`;

export const createFilePath = path => mkdirSync(path, { recursive: true });

export const getHash = (
  str: string,
  alg = 'sha1',
  digest: 'hex' | 'latin1' | 'base64' = 'hex',
) =>
  createHash(alg)
    .update(str)
    .digest(digest);

export const getHashedFileName = file =>
  `${getHash(file.originalname)}${extname(file.originalname)}`;

export const getOriginalFileMetadata = (
  file: BufferedFile,
): StoredFileMetadata => {
  const { encoding, mimetype, size, originalname: name } = file;
  return {
    encoding,
    mimetype,
    size,
    name,
  };
};

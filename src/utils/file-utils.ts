import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import { BufferedFile, StoredFileMetadata } from 'src/models/file.model';

export const setFileDestination = (req, file, cb) => {
  const dest = req.params.destination;
  return cb(null, setDestinationPath(dest));
};

export const setHashName = (req, file, cb) => {
  return cb(null, getHashedFileName(file.originalname));
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

export const getHashedFileName = originalname =>
  `${getHash(originalname)}${extname(originalname)}`;

export const getOriginalFileMetadata = (
  file: BufferedFile,
): StoredFileMetadata => {
  const { encoding, mimetype, size, originalname: name } = file;
  return {
    id: getHashedFileName(name),
    encoding,
    mimetype,
    size,
    name,
    updatedAt: null,
  };
};

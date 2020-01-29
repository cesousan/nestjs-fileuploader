export interface BufferedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: AppMimeType;
  size: number;
  buffer: Buffer | string;
}

export interface StoredFile extends StoredFileMetadata {
  id: string;
  file: Buffer | string;
}

export interface StoredFileMetadata {
  name: string;
  encoding: string;
  mimetype: AppMimeType;
  size: number;
}

export type AppMimeType =
  | 'text/plain'
  | 'text/html'
  | 'text/css'
  | 'text/javascript'
  | 'image/gif'
  | 'image/png'
  | 'image/jpeg'
  | 'image/bmp'
  | 'image/webp'
  | 'audio/midi'
  | 'audio/mpeg'
  | 'audio/webm'
  | 'audio/ogg'
  | 'audio/wav'
  | 'video/webm'
  | 'video/ogg'
  | 'application/octet-stream'
  | 'application/pkcs12'
  | 'application/vnd.mspowerpoint'
  | 'application/xhtml+xml'
  | 'application/xml'
  | 'application/pdf'
  | 'multipart/form-data'
  | 'multipart/byteranges';

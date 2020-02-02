import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

import getMinioConfig from './minio.config';
import { envStrToArray } from 'src/utils';

const { useSSL, endPoint, port } = getMinioConfig().minioClient;
const minioOrigin = `${useSSL ? 'https' : 'http'}://${endPoint}:${port}`;
const clientOrigins = process.env.CLIENT_ALLOWED_ORIGINS
  ? envStrToArray(process.env.CLIENT_ALLOWED_ORIGINS)
  : [`http://localhost:4200`];

export default {
  origin: [minioOrigin, ...clientOrigins],
} as CorsOptions;

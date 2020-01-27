import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

import getMinioConfig from './minio.config';

const { useSSL, endPoint, port } = getMinioConfig().minioClient;
const minioOrigin = `${useSSL ? 'https' : 'http'}://${endPoint}:${port}`;
const clientOrigin = `http://localhost:4200`;

export default <CorsOptions>{
  origin: [clientOrigin, minioOrigin]
};

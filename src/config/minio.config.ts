export default () => ({
  minioClient: {
    endPoint: process.env.MINIO_HOST || '127.0.0.1',
    port: parseInt(process.env.MINIO_PORT, 10) || 9000,
    useSSL: process.env.MINIO_USE_SSL === 'true' || false,
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  },
  baseBucket: process.env.MINIO_BASE_BUCKET || 'my-sport',
});

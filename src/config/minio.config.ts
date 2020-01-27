export default () => ({
  minioClient: {
    endPoint: '127.0.0.1',
    port: 9000,
    useSSL: false,
    accessKey: 'minioadmin',
    secretKey: 'minioadmin'
  },
  baseBucket: 'my-sport'
});

export default () => ({
  redisConnection: (returnBuffer: boolean = false) => ({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    db: parseInt(process.env.REDIS_DB, 10) || 4,
    password: process.env.REDIS_PASSWORD || null,
    // keyPrefix: process.env.REDIS_PREFIX || '',
    dropBufferSupport: !returnBuffer,
    return_buffer: returnBuffer,
  }),
});

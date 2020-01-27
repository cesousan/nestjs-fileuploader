export default () => ({
  redisConnection: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    db: parseInt(process.env.REDIS_DB) || 4,
    password: process.env.REDIS_PASSWORD || null,
    keyPrefix: process.env.REDIS_PREFIX || 'redis'
  }
});

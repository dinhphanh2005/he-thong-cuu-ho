const Redis = require('ioredis');
const logger = require('../utils/logger');

let redis = null;

const getRedis = () => {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    redis.on('connect', () => logger.info('✅ Redis kết nối thành công'));
    redis.on('error', (err) => logger.warn(`⚠️ Redis lỗi: ${err.message}`));
  }
  return redis;
};

module.exports = { getRedis };

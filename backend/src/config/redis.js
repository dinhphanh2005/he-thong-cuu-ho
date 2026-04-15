const Redis = require('ioredis');
const logger = require('../utils/logger');

let redis = null;
let redisAvailable = false;

const getRedis = () => {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
      maxRetriesPerRequest: null, // Required for Bull queues
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: (times) => {
        // Thử lại tối đa 3 lần với delay tăng dần, sau đó ngừng
        if (times >= 3) return null; // null = dừng retry
        return Math.min(times * 1000, 3000);
      },
    });

    redis.on('connect', () => {
      redisAvailable = true;
      logger.info('✅ Redis kết nối thành công');
    });
    redis.on('ready', () => { redisAvailable = true; });
    redis.on('error', (err) => {
      if (redisAvailable || err.code === 'ECONNREFUSED') {
        // Chỉ log một lần khi trạng thái thay đổi
        redisAvailable = false;
        logger.warn(`⚠️ Redis không khả dụng: ${err.message}`);
      }
    });
    redis.on('close', () => { redisAvailable = false; });
  }
  return redis;
};

const isRedisAvailable = () => redisAvailable;

module.exports = { getRedis, isRedisAvailable };

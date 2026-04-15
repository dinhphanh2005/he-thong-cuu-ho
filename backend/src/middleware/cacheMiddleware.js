const { getRedis, isRedisAvailable } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Middleware cache response của API
 * @param {number} duration Thời gian cache (giây)
 */
exports.cacheRoute = (duration) => {
  return async (req, res, next) => {
    // Không cache khi đang test hoặc Redis không kết nối
    if (process.env.NODE_ENV === 'test' || req.query.bypassCache === 'true') {
      return next();
    }

    // Kiểm tra Redis CÓ SẴN SÀNG không trước khi dùng
    if (!isRedisAvailable()) return next();

    const redis = getRedis();
    const userId = req.user?._id?.toString() || 'anon';
    const key = `__express__${userId}__${req.originalUrl || req.url}`;

    try {
      const cachedResponse = await redis.get(key);
      if (cachedResponse) {
        logger.debug(`[CACHE HIT] ${key}`);
        return res.status(200).json(JSON.parse(cachedResponse));
      }

      logger.debug(`[CACHE MISS] ${key}`);
      res.sendResponse = res.json;

      res.json = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redis.set(key, JSON.stringify(body), 'EX', duration).catch(() => {});
        }
        res.sendResponse(body);
      };

      next();
    } catch (error) {
      // Lỗi Redis → bỏ qua cache, tiếp tục request bình thường
      logger.debug(`[CACHE] Redis error (bỏ qua): ${error.message}`);
      next();
    }
  };
};

/**
 * Xóa cache theo pattern (targeted invalidation)
 * Chỉ chạy khi Redis đang kết nối — bỏ qua hoàn toàn nếu Redis offline.
 */
exports.clearCachePattern = (pattern) => {
  return async (req, res, next) => {
    // Chỉ xóa cache khi Redis thực sự kết nối
    if (!isRedisAvailable()) return next();

    const redis = getRedis();
    try {
      const keys = await redis.keys(`__express__*${pattern}*`);
      if (keys.length > 0) {
        await redis.del(keys);
        logger.debug(`[CACHE CLEARED] Pattern='${pattern}', xóa ${keys.length} keys`);
      }
    } catch (err) {
      // Không làm crash request — chỉ log ở level debug
      logger.debug(`[CACHE] clearCachePattern error (${pattern}): ${err.message}`);
    }
    next();
  };
};

/**
 * Xóa TOÀN BỘ cache — chỉ dùng khi Redis đang sẵn sàng.
 */
exports.clearCache = () => {
  return async (req, res, next) => {
    if (!isRedisAvailable()) return next();

    const redis = getRedis();
    try {
      const keys = await redis.keys('__express__*');
      if (keys.length > 0) {
        await redis.del(keys);
        logger.debug(`[CACHE CLEARED ALL] Xóa ${keys.length} keys`);
      }
    } catch (err) {
      logger.debug(`[CACHE] clearCache error: ${err.message}`);
    }
    next();
  };
};
